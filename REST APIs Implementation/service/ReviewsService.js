'use strict';

const Review = require('../components/review');
const User = require('../components/user');
const db = require('../components/db');
var constants = require('../utils/constants.js');


/**
 * Retrieve the reviews of the film with ID filmId
 * 
 * Input: 
 * - req: the request of the user
 * Output:
 * - list of the reviews
 * 
 **/
 exports.getFilmReviews = function(req) {
  return new Promise((resolve, reject) => {
      var sql = "SELECT r.filmId as fid, r.reviewerId as rid, delegatedId as did, completed, reviewDate, rating, review, c.total_rows "
            + "FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? ) c "
            + "LEFT JOIN delegations d ON r.delegationId == d.id "
            + "WHERE r.filmId = ? ";

      var params = getPagination(req);
      if (params.length != 2) sql = sql + " LIMIT ?,?";
      db.all(sql, params, (err, rows) => {
          if (err) {
              reject(err);
          } else {
              let reviews = rows.map((row) => createReview(row));
              resolve(reviews);
          }
      });
  });
}

/**
 * Retrieve the number of reviews of the film with ID filmId
 * 
 * Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
 * Output:
 * - total number of reviews of the film with ID filmId
 * 
 **/
 exports.getFilmReviewsTotal = function(filmId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? ";
      db.get(sqlNumOfReviews, [filmId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}



/**
 * Retrieve the review of the film having filmId as ID and issued to user with reviewerId as ID
 *
 * Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewerId: the ID ot the reviewer
 * Output:
 * - the requested review
 * 
 **/
exports.getSingleReview = function (filmId, reviewerId) {
    return new Promise((resolve, reject) => {

        // added delegation info
        const sql = "SELECT filmId as fid, reviewerId as rid, delegatedId as did, completed, reviewDate, rating, review "
            + "FROM reviews R LEFT JOIN delegations D ON R.delegationId = D.id "
            + "WHERE filmId = ? AND reviewerId = ? ";

        db.all(sql, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else {
                var review = createReview(rows[0]);
                resolve(review);
            }
        });
    });
}


/**
 * Delete a review invitation (if exists, it deletes also the delegation)
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewerId: ID of the reviewer
 * - owner : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.deleteSingleReview = function (filmId, reviewerId, owner) {
    return new Promise((resolve, reject) => {

        const sql1 = "SELECT f.owner, r.completed, r.delegationId FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.reviewerId = ?";
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if (owner != rows[0].owner) {
                reject("403");
            }
            else if (rows[0].completed == 1) {
                reject("409");
            }
            else {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION', err => {
                        if (err) 
                            return reject(err);

                        // delete the review
                        const sql1 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ?';
                        db.run(sql1, [filmId, reviewerId], (err) => {
                            if (err) {
                                return db.run('ROLLBACK', () => reject(err));
                            }

                            // delete the delegation record (if any)
                            if (rows[0].delegationId != null) {
                                const sql2 = 'DELETE FROM delegations WHERE id = ?';
                                db.run(sql2, [rows[0].delegationId], (err) => {
                                    if (err) {
                                        return db.run('ROLLBACK', () => reject(err));
                                    }

                                    db.run('COMMIT', resolve);
                                });
                            } else {
                                db.run('COMMIT', resolve);
                            }
                        });
                    });
                });
            }
        });
    });
}



/**
 * Issue a film review to a user
 *
 *
 * Input: 
 * - reviewerId : ID of the film reviewer
 * - filmId: ID of the film 
 * - owner: ID of the user who wants to issue the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.issueFilmReview = function(invitations,owner) {
    console.log(invitations)
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT owner, private FROM films WHERE id = ?";
      db.all(sql1, [invitations[0].filmId], (err, rows) => {
          if (err){
                reject(err);
          }
          else if (rows.length === 0){
              reject(404);
          }
          else if(owner != rows[0].owner) {
              reject(403);
          } else if(rows[0].private == 1) {
              reject(404);
          }
          else {
            var sql2 = 'SELECT * FROM users' ;
            var invitedUsers = [];
            for (var i = 0; i < invitations.length; i++) {
                console.log(invitations[i]);
                if(i == 0) sql2 += ' WHERE id = ?';
                else sql2 += ' OR id = ?'
                invitedUsers[i] = invitations[i].reviewerId;
            }
            db.all(sql2, invitedUsers, async function(err, rows) {
                if (err) {
                    reject(err);
                } 
                else if (rows.length !== invitations.length){
                    reject(409);
                }
                else {
                    const sql3 = 'INSERT INTO reviews(filmId, reviewerId, completed) VALUES(?,?,0)';
                    var finalResult = [];
                    for (var i = 0; i < invitations.length; i++) {
                        var singleResult;
                        try {
                            singleResult = await issueSingleReview(sql3, invitations[i].filmId, invitations[i].reviewerId);
                            finalResult[i] = singleResult;
                        } catch (error) {
                            reject ('Error in the creation of the review data structure');
                            break;
                        }
                    }

                    if(finalResult.length !== 0){
                        resolve(finalResult);
                    }        
                }
            }); 
          }
      });
  });
}

const issueSingleReview = function(sql3, filmId, reviewerId){
    return new Promise((resolve, reject) => {
        db.run(sql3, [filmId, reviewerId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, reviewerId, false);
                resolve(createdReview);
            }
        });
    })
}

/**
 * Delegate a review to a user 
 * 
 * Input: 
 * - delegation: delegation object 
 * - reviewerId: ID of the reviewer
 * Output:
 * - no response expected for this operation
 *  
 * */
exports.delegateReview = function(delegation, reviewerId) {
    return new Promise((resolve, reject) => {
        // check if the delegated user exists
        const sql0 = "SELECT * FROM users WHERE id = ?";
        db.all(sql0, [delegation.delegatedId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length !== 1)
                reject(409);    // the delegated user does not exist
            else {
                // check if the review exists and it is not already completed
                const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
                db.all(sql1, [delegation.filmId, reviewerId], (err, rows) => {
                    if (err)
                        reject(err);
                    else if (rows.length === 0)
                        reject(404);    // the review  with this reviewer does not exist                    
                    else if (rows[0].completed == 1)
                        reject(403);    // the review has been already completed
                    else if (rows[0].delegationId != null)
                        reject(410);    // the review has been already delegated
                    else {
                        db.serialize(() => {
                            db.run('BEGIN TRANSACTION');
                            // insert delegation (saving a stamp of the review)
                            const sql2 = 'INSERT INTO delegations(delegatedId, reviewDate_stamp, rating_stamp, review_stamp) VALUES(?,?,?,?)';
                            db.run(sql2, [delegation.delegatedId, rows[0].reviewDate, rows[0].rating, rows[0].review], function(err) {
                                if (err) {
                                    return db.run('ROLLBACK', () => {
                                        reject(err);
                                    });
                                }

                                // add the delegation reference into the reviews table
                                const sql3 = 'UPDATE reviews SET delegationId = ? WHERE filmId = ? AND reviewerId = ?';
                                db.run(sql3, [this.lastID, delegation.filmId, reviewerId], function(err) {
                                    if (err) {
                                        return db.run('ROLLBACK', () => {
                                            reject(err);
                                        });
                                    }

                                    db.run('COMMIT', resolve);
                                });
                            });
                        });
                    }
                });
            }
        });
    });        
}

/**
 * Delete a delegation 
 * 
 * Input:
 * - filmId: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - no response expected for this operation
 * 
 * */
exports.deleteDelegation = function(filmId, reviewerId) {
    return new Promise((resolve, reject) => {

        const sql1 = "SELECT r.reviewerId, r.completed, r.delegationId FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.reviewerId = ?";
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);    // the review does not exist
            else if (reviewerId != rows[0].reviewerId)
                reject(403);    // the user is not the reviewer of the film
            else if (rows[0].completed == 1) 
                reject(409);    // the review has been already completed
            else if (rows[0].delegationId == null)
                reject(410);    // the review has not been delegated
            else {
                // retrieve the previous review data
                const sql2 = "SELECT id, reviewDate_stamp, rating_stamp, review_stamp FROM delegations WHERE id = ?";
                db.all(sql2, [rows[0].delegationId], (err, rows) => {
                    if (err)
                        reject(err);
                    else {
                        // update the review with the previous data and delete the delegation
                        db.serialize(() => {
                            db.run('BEGIN TRANSACTION', function(err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    const delegationId = rows[0].id;
                                    // update the review with the previous data
                                    const sql3 = 'UPDATE reviews SET reviewDate = ?, rating = ?, review = ?, delegationId = NULL WHERE filmId = ? AND reviewerId = ?';
                                    db.run(sql3, [rows[0].reviewDate_stamp, rows[0].rating_stamp, rows[0].review_stamp, filmId, reviewerId], function(err) {
                                        if (err) {
                                            db.run('ROLLBACK', function() {
                                                reject(err);
                                            });
                                        } else {
                                            // delete delegation
                                            const sql4 = 'DELETE FROM delegations WHERE id = ?';
                                            db.run(sql4, [delegationId], function(err) {
                                                if (err) {
                                                    db.run('ROLLBACK', function() {
                                                        reject(err);
                                                    });
                                                } else {
                                                    db.run('COMMIT', function(err) {
                                                        if (err) {
                                                            reject(err);
                                                        } else {
                                                            resolve(null);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    });
}

/**
 * Update/Complete a review
 *
 * Input:
 * - review: review object 
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.updateSingleReview = function(review, filmId, reviewerId) {
  return new Promise((resolve, reject) => {
        
      const sql1 = "SELECT r.*, d.delegatedId FROM reviews r " 
                + "LEFT JOIN delegations d "
                + "ON r.delegationId == d.id "
                + "WHERE filmId = ? AND reviewerId = ?";
      db.all(sql1, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);  // bad filmId or ReviewerId
          else if(rows[0].delegationId != null && (review.delegatedId == null || rows[0].delegatedId != review.delegatedId))
              reject(403);  // the user is not the delegated one
          else if (rows[0].completed == 1)
              reject(409);  // the review has been already completed
          else {
            var sql2 = 'UPDATE reviews SET completed = ?';
            var parameters = [review.completed];
            if(review.reviewDate != undefined){
              sql2 = sql2.concat(', reviewDate = ?');
              parameters.push(review.reviewDate);
            } 
            if(review.rating != undefined){
                sql2 = sql2.concat(', rating = ?');
                parameters.push(review.rating);
            } 
            if(review.review != undefined){
                sql2 = sql2.concat(', review = ?');
                parameters.push(review.review);
            } 
            sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ?');
            parameters.push(filmId);
            parameters.push(reviewerId);

            db.run(sql2, parameters, function(err) {
              if (err) {
              reject(err);
              } else {
              resolve(null);
            }
           })
          }
      });
  });
}

/**
 * Utility functions
 */
 const getPagination = function(req) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(constants.OFFSET);
  var limits = [];
  limits.push(req.params.filmId);
  limits.push(req.params.filmId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}


const createReview = function(row) {
  var completedReview = (row.completed === 1) ? true : false;
  return new Review(row.fid, row.rid, row.did, completedReview, row.reviewDate, row.rating, row.review);
}
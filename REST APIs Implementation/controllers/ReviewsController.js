'use strict';

var utils = require('../utils/writer.js');
var Reviews = require('../service/ReviewsService');
var constants = require('../utils/constants.js');

module.exports.getFilmReviews = function getFilmReviews (req, res, next) {

    //retrieve a list of reviews
    var numOfReviews = 0;
    var next=0;

    Reviews.getFilmReviewsTotal(req.params.filmId)
        .then(function(response) {
          
            numOfReviews = response;
            Reviews.getFilmReviews(req)
            .then(function(response) {
                if (req.query.pageNo == null) var pageNo = 1;
                else var pageNo = req.query.pageNo;
                var totalPage=Math.ceil(numOfReviews / constants.OFFSET);
                next = Number(pageNo) + 1;
                if (pageNo>totalPage) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                } else if (pageNo == totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfReviews,
                        reviews: response
                    });
                } else {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfReviews,
                        reviews: response,
                        next: "/api/films/public/" + req.params.taskId +"?pageNo=" + next
                    });
                }
        })
        .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
        })
        .catch(function(response) {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      });
  
};


module.exports.getSingleReview = function getSingleReview (req, res, next) {

    Reviews.getSingleReview(req.params.filmId, req.params.reviewerId)
        .then(function(response) {
            utils.writeJson(res, response);
        })
        .catch(function(response) {
            if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
};


module.exports.deleteSingleReview = function deleteSingleReview (req, res, next) {

  Reviews.deleteSingleReview(req.params.filmId, req.params.reviewerId, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if(response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so the invitation cannot be deleted anymore.' }], }, 409);
      }
      else if (response == 404){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
      }
      else {
        utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
};

module.exports.issueFilmReview = function issueFilmReview (req, res, next) {
  var differentFilm = false;
  for(var i = 0; i < req.body.length; i++){
    if(req.params.filmId != req.body[i].filmId){
      differentFilm = true;
    }
  }
  if(differentFilm){
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId field of the review object is different from the filmdId path parameter.' }], }, 409);
  }
  else {
    Reviews.issueFilmReview(req.body, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (response) {
      if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The public film does not exist.' }], }, 404);
      }
      else if (response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user with ID reviewerId does not exist.' }], }, 404);
      }
      else {
          utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
  }
};

module.exports.delegateReview = function delegateReview (req, res, next) {
  if(req.params.reviewerId != req.user.id || req.body.reviewerId != req.user.id)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId is not equal the id of the requesting user.' }], }, 400);
  }
  else if (req.body.delegatedId == req.user.id)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The delegated user cannot be the requesting one.' }], }, 400);
  }
  else if(req.params.filmId != req.body.filmId)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId in the body is not equal to the filmId in the params.' }], }, 400);
  }
  else if(req.body.delegatedId == undefined) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The delegatedId property is absent.' }], }, 400);
  }
  else {
    Reviews.delegateReview(req.body, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if (response == 403){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'the review has been already completed, so the delegation cannot be done.' }], }, 409);
      }
      else if (response == 410){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'the review has been already delegated, so the delegation cannot be done.' }], }, 409);
      }
      else if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
      }
      else if (response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user with ID delegatedId does not exist.' }], }, 404);
      }
      else {
          utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
  }
};

module.exports.deleteDelegation = function deleteDelegation (req, res, next) {
  if(req.params.reviewerId != req.user.id)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId is not equal the id of the requesting user.' }], }, 400);
  }
  else {
    Reviews.deleteDelegation(req.params.filmId, req.params.reviewerId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the reviewer of the film' }], }, 403);
      }
      else if(response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so the delegation cannot be deleted anymore.' }], }, 409);
      }
      else if (response == 404){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
      }
      else if(response == 410){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has not been delegated.' }], }, 409);
      }
      else {
        utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
  }
};

module.exports.updateSingleReview = function updateSingleReview (req, res, next) {

  // validation of the request regarding both the delegated and not delegated review
  if( !(req.params.reviewerId == req.user.id && req.body.delegatedId == undefined && req.body.reviewerId == req.user.id) 
    && !(req.body.delegatedId == req.user.id && req.body.delegatedId != undefined && req.body.reviewerId != req.user.id && req.params.reviewerId != req.user.id))
  {
    req.body.delegatedId == undefined ?
      // not delegated review
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId is not equal the id of the requesting user.' }], }, 400)
      // delegated review
      : utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The delegatedId is not equal the id of the requesting user.' }], }, 400);
  }
  else if(req.params.filmId != req.body.filmId)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId in the body is not equal to the filmId in the params.' }], }, 400);
  }
  else if(req.body.completed == undefined) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The completed property is absent.' }], }, 400);
  }
  else if(req.body.completed == true && (req.body.review == undefined || req.body.rating == undefined || req.body.reviewDate == undefined)) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'To complete a review the following fields are required: review, rating and reviewDate' }], }, 400);
  }
  else {
    Reviews.updateSingleReview(req.body, req.params.filmId, req.params.reviewerId)
    .then(function(response) {
        utils.writeJson(res, response, 204);
    })
    .catch(function(response) {
        if(response == 403){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the delegated one of the film' }], }, 403);
        }
        else if (response == 404){ // include the case of the wrong reviewerId
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
        }
        else if (response == 409){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so it cannot be modified anymore.' }], }, 409);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });
  }
};


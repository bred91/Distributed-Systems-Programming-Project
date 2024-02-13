# Rest API: design and implementation

The structure of this repository is the following:
  - [JSON Schemas](<./JSON Schemas/>) contains the design of the JSON Schemas;
  - [REST APIs Design](<./REST APIs Design/>)  contains the full Open API documentation of the REST APIs, including examples of JSON documents to be used when invoking the operations, and examples of invocations of the API operations, possibly as a Postman collection;
  - [REST APIs Implementation](<./REST APIs Implementation/>) contains the code of the Film Manager service application.

## Introduction

My solution for this exam call is based on the code provided in [this repository](https://github.com/polito-DSP-2022-23/lab01-json-rest), which is the official solution for [Lab01](./Lab01.pdf).

I've extended the REST APIs, by introducing the possibility for a user who has been assigned a review to update the review partially before completing it and to delegate the review to another user, according to the following specifications (a full and detailed explanation can be found [here](./DSP_20240212.pdf)):
1. A reviewer who has been invited to do a review for a public film can update the review fields partially at different times, e.g., save a first draft of the review text, then, after some time, save the rating, and finally update the review draft to the final text, and set the date and the completed flag to true. When the completed flag has been set to true, no further modification of the review is possible.
2. After a review invitation has been issued to a reviewer, this reviewer can delegate that review to another user. This operation can be done only if the review has not yet been completed. The reviewer cannot delegate the review to more than one user.
3. After a review has been delegated, it can be updated and completed only by the user the review has been delegated to, not by the delegating user.
4. When a review of a public film which has been delegated is retrieved, it must carry the information of both the user the review was issued to, and the user it was delegated to.
5. A user a review has been delegated to can only update and complete the review. It is not possible for this user to delegate the review to yet another user.
6. After delegating a review, the reviewer who was originally invited to do the review can cancel the delegation, provided the review has not yet been completed. After cancelling the delegation of a review, the review must return to the state it had before delegating the review.
7. The owner of a public film can cancel a review request for that film, even if there is a delegation. In that case, also the related delegation is canceled.

## Design choices

To meet the requirements, I've made the following changes to the code provided in the repository mentioned above:

### Schema

- Modify the [review](<./JSON Schemas/review_schema.json>) schema in order to have an extra field called `delegatedId` which will indicate the id of the user delegated of the review and changed the dependencies in order to allow to partially update the review;

- Add a new schema [delegation](<./JSON Schemas/delegation_schema.json>) that is used to represent a delegation. A delegation is composed by the following fields:
  - `filmId`: the id of the film to be reviewed;
  - `reviewerId`: the id of the reviewer that has been issued the review;
  - `delegatedId`: the id of the user that will be delegated of the review;
  
### REST APIs

#### - New
- `POST` `/api/films/public/:filmId/reviews/:reviewId/delegation`<br>
  allows a reviewer to delegate a review to another user (if the review has not yet been completed);
- `DELETE` `/api/films/public/:filmId/reviews/:reviewId/delegation`<br>
  allows a reviewer to cancel the delegation of a review (if the review has not yet been completed);

#### - Modified
- `GET` `/api/films/public/:filmId/reviews`<br>
  added the `delegatedId` field to the response if the review has been delegated;
- `GET` `/api/films/public/:filmId/reviews/:reviewerId`<br>
  added the `delegatedId` field to the response if the review has been delegated;
- `PUT` `/api/films/public/:filmId/reviews/:reviewerId`<br>
  added the possibility to partially update the review and additional controls to who asks for the update;
- `DELETE` `/api/films/public/:filmId/reviews/:reviewerId`<br>
  added the deletion of the delegation if the review has been delegated;

For further details, please refer to the [REST APIs Design](<./REST APIs Design/>) folder.

### Database

In order to add the information of the delegation, I've made the following changes to the database:
- Add a new table `delegations` that is used to store the information of the delegation and a "screenshot" of the review fields at the moment of the delegation. <br>
The table has the following fields:
  - `id`: the id of the delegation (<ins>primary key</ins>);
  - `delegatedId`: the id of the user that will be delegated of the review (<ins>foreign key</ins> to the `users` table);
  - `reviewDate_stamp`: the date field of the review at the moment of the delegation;
  - `rating_stamp`: the rating field of the review at the moment of the delegation;
  - `review_stamp`: the text field of the review at the moment of the delegation;
- Add a column `delegationId` to the `reviews` table, which will contain the id of the row into the `delegations` table (<ins>foreign key</ins>);


## How to run the application
From the directory [REST APIs Implementation](<./REST APIs Implementation>),<br>
to install dependencies:<br>
```npm install```<br>
to launch the server: <br>
```npm start```

To view the Swagger UI interface:
open http://localhost:3001/docs

You can also find a Postman collection [here](./REST%20APIs%20Design/DSP-23_24-call1.postman_collection.json) to test the APIs. <br>
In the collection, where is speciefied Frank in the title of the request, you need to test it with the user Frank logged in (so you need to log in with Frank's credentials using the provided 'login frank' request into the login_logout folder). The other requests should be tested after being logged in with the User's credentials (also in this case there is a pre-made login request). <br>
The database is pre-populated with some data, including some reviews and delegations, to test the new functionalities. 

Database can be visualised by means of https://sqlitebrowser.org/ by importing:
\database\databaseV1.db

To test the app, use the following credentials:
- Username: user.dsp@polito.it
- Password: password

Other users credetials can be found in this [file](./REST%20APIs%20Implementation/database/passwords_databases.txt).

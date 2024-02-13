-- database: c:\Users\paner\Dropbox (Politecnico Di Torino Studenti)\Polito\Ongoing\Distributed System Programming\Exam\exam-call-1-bred91\REST APIs Implementation\database\databaseV1.db

-- Use the ▷ button in the top right corner to run the entire file.

CREATE TABLE "delegations" (
    "id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "delegatedId"	INTEGER NOT NULL,
    "reviewDate_stamp" TEXT,
    "rating_stamp"  INTEGER,
    "review_stamp"  TEXT,

    FOREIGN KEY("delegatedId") REFERENCES "users"("id")
);

INSERT INTO "delegations" VALUES (12,4,NULL,NULL,NULL); 
INSERT INTO "reviews" VALUES (1,3,0,NULL,NULL,NULL,12);
INSERT INTO "reviews" VALUES (1,4,1,'2023-12-12',5,'Fantastic!!',NULL);


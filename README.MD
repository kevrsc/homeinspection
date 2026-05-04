Purpose: Create a service that manages the tasks associated with a home inspection report.

## Run the API (Phase 1 scaffold)

The NestJS application lives in `homeinspection-api/`.

- **Node:** use an LTS version in the range declared in `homeinspection-api/package.json` under `engines.node` (currently `>=20.18.0 <25`).
- **Install and dev server:** `cd homeinspection-api` then `npm install` (if needed) and `npm run start:dev`.
- **Production-style start (after build):** `npm run build` then `npm run start:prod` (listens on port `3000` unless `PORT` is set).

Technologies: 
1. NodeJS microservice using typescript
2. AWS SQS
3. AWS MySQL
4. Testcontainers for Node.js
5. Jest for testing

Phases:
1. Reading a home inspection report.
  A. Create an API that accepts a home inspection report PDF file as an HTTP uploaded file.
  B. Parse the file using a PDF reader and extract the "Observations" and the section those observations belong to. 
  C. Return these observations to the caller of the API.

2. Persist the observations.
  A. Create a MySQL database using Docker.
  B. Add a new schema to the database and a table for the observations.
  C. Add fields to the table for the section and the observations for that section.
  D. Create a table index on the section column.
  E. Write the extracted observations to the database.
  F. Create a new API endpoint that is used to read the observations saved in the database.
  G. Modify the API endpoint for the file upload to accept the file and return a pass or fail status, not the extracted observations.

3. Asynchronously process the PDF file
  A. Create an AWS SQS using Docker.
  B. When a file is uploaded, add an SQS queue message that contains the filename and path for where it is saved.
  C. Create a process that is triggered by an SQS message being enqueued to consume the message.
  D. This consumer process will then read the PDF file based on the filename and location in the SQS message.
  E. This consumer process will write the observations to the database.

4. Add AI 
  A. Create a new API endpoint for returning an LLM response of the observations saved in the database.
  B. Use the existing database read process to extract the observations.
  C. Create a Docker that can run an LLM to be used for analyzing the observations.
  D. Use a prompt for the LLM that will summarize and prioritize all of the observations in the PDF file.
  D. Return the LLM response to the API caller. 

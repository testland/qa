# Schemathesis runs green but never found the orders bug

## Problem Description

Schemathesis runs green against our orders API (`openapi.yaml`) but never found the bug in `docs/bug.md`. Make it able to find this kind of bug, and show the commands or test code.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: openapi.yaml ===============
openapi: 3.1.0
info: { title: Orders, version: 1.0.0 }
paths:
  /orders:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [sku, quantity]
              properties:
                sku: { type: string }
                quantity: { type: integer, minimum: 1 }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties: { id: { type: string } }
  /orders/{orderId}:
    parameters:
      - { name: orderId, in: path, required: true, schema: { type: string } }
    get:
      operationId: getOrder
      responses:
        "200": { description: OK }
        "404": { description: Not found }
    delete:
      operationId: deleteOrder
      responses:
        "204": { description: Deleted }
        "404": { description: Not found }

=============== FILE: docs/bug.md ===============
Production bug: after DELETE /orders/{id} returns 204, GET /orders/{id} still returns 200 for about
60 seconds (stale cache). Our Schemathesis run is green: it only ever sends random order ids, which all 404.

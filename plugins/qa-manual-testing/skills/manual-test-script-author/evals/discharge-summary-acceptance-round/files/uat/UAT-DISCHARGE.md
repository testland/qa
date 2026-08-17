# Discharge acceptance

1. Authenticate against the UAT tenant and obtain a bearer token.
2. POST /api/v2/encounters/{encounterId}/discharge with status FINAL;
   assert 201 and that the response body contains a summaryId.
3. Confirm a row lands in discharge_summary with status = 'FINAL' and
   signed_by populated.
4. Verify the outbound HL7 ADT^A03 message appears on the integration
   queue within 30s.
5. Repeat step 2 with a malformed patient identifier; assert 422 and the
   error code INVALID_PATIENT_ID.
6. Check the PDF renders (S3 bucket stbrigid-uat-summaries, key
   summaries/{summaryId}.pdf).
7. Confirm the GP letter job is enqueued.

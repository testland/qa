# SQS LocalStack recipes: DLQ routing and FIFO ordering

DLQ-routing and FIFO ordering/dedup recipes referenced from
`sqs-tests`'s SKILL.md (Step 6 and Step 7). Both run against LocalStack
(or real SQS), not mocks. The mock-based unit tests and the
visibility-timeout recipe stay in the main skill file.

## DLQ routing

SQS supports dead-letter queues for poison-message isolation; after
`maxReceiveCount` failed deliveries the message moves to the DLQ (per
the SQS developer guide).

```python
dlq_url = sqs.create_queue(QueueName='orders-dlq')['QueueUrl']
dlq_arn = sqs.get_queue_attributes(QueueUrl=dlq_url, AttributeNames=['QueueArn'])['Attributes']['QueueArn']

queue_url = sqs.create_queue(
    QueueName='orders',
    Attributes={
        'RedrivePolicy': json.dumps({'deadLetterTargetArn': dlq_arn, 'maxReceiveCount': 3}),
    },
)['QueueUrl']

sqs.send_message(QueueUrl=queue_url, MessageBody='poison')
for _ in range(4):
    msg = sqs.receive_message(QueueUrl=queue_url, VisibilityTimeout=0)
    # Don't delete; let visibility expire and re-receive

# After 3 receives, message is in DLQ:
dlq_msg = sqs.receive_message(QueueUrl=dlq_url)
assert dlq_msg['Messages'][0]['Body'] == 'poison'
```

## FIFO ordering + dedup

```python
fifo_url = sqs.create_queue(
    QueueName='orders.fifo',
    Attributes={'FifoQueue': 'true', 'ContentBasedDeduplication': 'true'},
)['QueueUrl']

sqs.send_message(QueueUrl=fifo_url, MessageBody='msg-1', MessageGroupId='group-A')
sqs.send_message(QueueUrl=fifo_url, MessageBody='msg-2', MessageGroupId='group-A')

# Same body within 5min dedup window -> second send is dropped:
sqs.send_message(QueueUrl=fifo_url, MessageBody='msg-1', MessageGroupId='group-A')

response = sqs.receive_message(QueueUrl=fifo_url, MaxNumberOfMessages=10)
bodies = [m['Body'] for m in response['Messages']]
assert bodies == ['msg-1', 'msg-2']  # Strict order; dedup applied
```

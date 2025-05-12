# Raw Landing Zone Bucket
output "landing_s3_bucket_arn" {
  value = module.workflow.landing_s3_bucket_arn
}

output "landing_sns_topic_arn" {
  value = module.workflow.landing_sns_topic_arn
}

output "landing_s3_bucket_arn" {
  value = module.landing_s3_bucket.s3_bucket_arn
}

output "landing_sns_topic_arn" {
  value = module.landing_sns_topic.topic_arn
}

output "thumbnail_s3_bucket_arn" {
  value = module.thumbnail_s3_bucket.s3_bucket_arn
}

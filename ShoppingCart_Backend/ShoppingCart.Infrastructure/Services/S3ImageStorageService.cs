using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using ShoppingCart.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ShoppingCart.Infrastructure.Services
{
    public class S3ImageStorageService : IImageStorageService
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly string _region;

        public S3ImageStorageService(IConfiguration configuration)
        {
            var accessKey = configuration["Aws:AccessKey"];
            var secretKey = configuration["Aws:SecretKey"];
            _region = configuration["Aws:Region"]!;
            _bucketName = configuration["Aws:BucketName"]!;

            _s3Client = new AmazonS3Client(accessKey, secretKey, Amazon.RegionEndpoint.GetBySystemName(_region));
        }

        public async Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType)
        {
            var key = $"products/{fileName}";

            var request = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = key,
                InputStream = fileStream,
                ContentType = contentType
                // Note: no CannedACL here — the bucket policy from Step 2 already makes
                // every object publicly readable, so setting per-object ACLs isn't needed
                // (and modern S3 buckets often have ACLs disabled entirely by default).
            };

            await _s3Client.PutObjectAsync(request);

            return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{key}";
        }
    }
}

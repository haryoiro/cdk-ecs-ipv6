import { Duration, RemovalPolicy, Tags } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket, BucketEncryption, LifecycleRule, StorageClass } from "aws-cdk-lib/aws-s3";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

interface BucketInfo {
    readonly resourceName: string;
    readonly encryption: BucketEncryption;
    readonly publicAccessBlockConfiguration: BlockPublicAccess;
    readonly removalPolicy: RemovalPolicy;
    readonly lifecycleRules: LifecycleRule[];
    readonly serverAccessLogsPrefix?: string;
    readonly assign: (bucket: Bucket) => void;
}

export class S3Buckets extends Resource {
    public elbLogBucket: Bucket;

    private readonly bucketInfoList: BucketInfo[] = [
        {
            resourceName: 'elb-log-bucket',
            encryption: BucketEncryption.S3_MANAGED,
            publicAccessBlockConfiguration: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
            lifecycleRules: [
                {
                    enabled: true,
                    // 10日後にStandard_IAに移行
                    transitions: [
                        {
                            storageClass: StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: Duration.days(1)
                        }
                    ]
                }
            ],
            serverAccessLogsPrefix: 'access-logs/',
            assign: (bucket: Bucket) => { this.elbLogBucket = bucket }
        },
        // 他のバケットの設定をここに追加できます
    ];

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.bucketInfoList.forEach(info => {
            const bucket = new Bucket(this, this.createResourceName(this, info.resourceName), {
                bucketName: this.createResourceName(this, info.resourceName),
                encryption: info.encryption,
                blockPublicAccess: info.publicAccessBlockConfiguration,
                removalPolicy: info.removalPolicy,
                lifecycleRules: info.lifecycleRules,
                serverAccessLogsPrefix: info.serverAccessLogsPrefix
            });
            Tags.of(bucket).add('Name', this.createResourceName(this, info.resourceName));

            info.assign(bucket);
        });
    }

}

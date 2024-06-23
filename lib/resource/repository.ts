import { CfnRepository, } from "aws-cdk-lib/aws-ecr";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";
import { Fn, RemovalPolicy } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Effect, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Roles } from "./role";

interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly assign: (repository: CfnRepository) => void;
    //@docs https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr.LifecycleRule.html
    readonly lifecyclePolicies?: string;
    readonly role?: Role
}

export class Repository extends Resource {
    public repository: CfnRepository;

    private readonly resources: ResourceInfo[]

    constructor(
        scope: Construct,
        id: string,
        private readonly roles: Roles
    ) {
        super(scope, id);

        this.resources = [
            {
                id: 'app-repository',
                resourceName: 'app-repository',
                assign: (repository: CfnRepository) => { this.repository = repository },
                lifecyclePolicies: Fn.toJsonString({
                    rules: [
                        {
                            rulePriority: 1,
                            description: 'Keep last 20 images',
                            selection: {
                                tagStatus: 'any',
                                countType: 'imageCountMoreThan',
                                countNumber: 20,
                            },
                            action: {
                                type: 'expire'
                            }
                        }
                    ]
                }),
                role: this.roles.taskRole,
            }
        ];

        this.resources.forEach(resource => {
            const repositoryName = this.createResourceName(this, resource.resourceName);
            const repository = new CfnRepository(this, resource.resourceName, {
                repositoryName: repositoryName,
                encryptionConfiguration: {
                    encryptionType: 'KMS'
                },
                // imageScanOnPushはduplicatedなのでfalse固定
                imageScanningConfiguration: {
                    scanOnPush: false
                },
                lifecyclePolicy: resource.lifecyclePolicies ? {
                    lifecyclePolicyText: resource.lifecyclePolicies
                } : undefined,
                tags: [{ key: 'Name', value: this.createResourceName(this, resource.resourceName) }]
            });

            repository.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE);

            // プルするためのロールを指定
            if (resource.role) {
                const policyStatement = new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'ecr:GetDownloadUrlForLayer',
                        'ecr:BatchGetImage',
                        'ecr:BatchCheckLayerAvailability'
                    ],
                    resources: [repository.attrArn]
                });
                resource.role.addToPrincipalPolicy(policyStatement);
            }

            resource.assign(repository);

            new StringParameter(this, `${this.createResourceName(this, resource.resourceName)}-uri`, {
                parameterName: `/${this.createResourceName(this, resource.resourceName)}/uri`,
                stringValue: Fn.getAtt(repository.logicalId, 'RepositoryUri').toString()
            })

        });
    }
}

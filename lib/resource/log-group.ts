import { CfnLogGroup, LogGroup } from "aws-cdk-lib/aws-logs";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";
import { Effect, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Roles } from "./role";
import { Fn, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Vpc } from "./vpc";

interface ResourceInfo {
    readonly id: string;
    readonly logGroupName: string;
    readonly retentionInDays: number;
    readonly removalPolicy: RemovalPolicy
    readonly role?: Role;
    readonly paramStore?: string;
    readonly assign: (logGroup: CfnLogGroup) => void;
}

export class LogGroups extends Resource {
    public ecsClusterEcsExecLogGroup: CfnLogGroup;
    public ecsAppServiceLogGroup: CfnLogGroup;

    private readonly resources: ResourceInfo[]

    constructor(
        scope: Construct,
        id: string,
        private readonly roles: Roles,
    ) {
        super(scope, id)
        this.resources = [
            {
                id: 'ecs-cluster-exec-logs',
                logGroupName: '/ecs/ecs-exec/logs',
                retentionInDays: 30,
                removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
                assign: (logGroup: CfnLogGroup) => { this.ecsClusterEcsExecLogGroup = logGroup }
            },
            {
                id: 'ecs-app-service-logs',
                logGroupName: '/ecs/app-service/logs',
                retentionInDays: 30,
                role: roles.taskExecutionRole,
                removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
                paramStore: '/ecs/app-service/logs',
                assign: (logGroup: CfnLogGroup) => { this.ecsAppServiceLogGroup = logGroup },
            }
        ]
        this.resources.forEach(resource => {
            const logGroup = new CfnLogGroup(this, resource.id, {
                logGroupName: resource.logGroupName,
                retentionInDays: resource.retentionInDays,
            });

            // ロールに書き込み権限を付与
            if (resource.role) {
                const logGroupArn = Fn.getAtt(logGroup.logicalId, 'Arn').toString();
                resource.role.addToPrincipalPolicy(new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                    ],
                    resources: [logGroupArn]
                }));
            }

            // パラメータストアにロググループ名を保存
            if (resource.paramStore) {
                new StringParameter(this, `${this.createResourceName(this, resource.id)}-log-group-name`, {
                    parameterName: `/${this.createResourceName(this, resource.paramStore)}/log-group-name`,
                    stringValue: resource.logGroupName,
                })
            }

            resource.assign(logGroup);
        })
    };

}

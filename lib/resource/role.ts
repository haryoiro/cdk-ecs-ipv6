import { CfnRole, IManagedPolicy, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";
import { IResolvable, Tags } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly assign: (role: Role) => void;
    readonly policies: PolicyStatement[];
    readonly managedPolicies: IManagedPolicy[];
    readonly assumedBy: ServicePrincipal;
}

export class Roles extends Resource {
    public taskExecutionRole: Role;
    public taskRole: Role;

    private readonly resources: ResourceInfo[] = [
        {
            id: 'taskExecutionRole',
            resourceName: 'task-execution-role',
            policies: [],
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
            ],
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            assign: (role: Role) => { this.taskExecutionRole = role }
        },
        {
            id: 'taskRole',
            resourceName: 'task-role',
            policies: [],
            managedPolicies: [],
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            assign: (role: Role) => { this.taskRole = role }
        }
    ]

    constructor(scope: Construct, id: string) {
        super(scope, id)

        this.resources.forEach(resource => {
            const role = new Role(this, resource.id, {
                roleName: this.createResourceName(this, resource.resourceName),
                assumedBy: resource.assumedBy,
                managedPolicies: resource.managedPolicies,
            });
            // インラインポリシーを指定
            if (resource.policies) {
                resource.policies.forEach(policy => {
                    role.addToPolicy(policy);
                });
            }
            Tags.of(role).add('Name', this.createResourceName(this, resource.resourceName));

            resource.assign(role);

            // RoleのARNをSSMに保存
            new StringParameter(this, `${this.createResourceName(this, resource.resourceName)}-arn`, {
                parameterName: `/${this.createResourceName(this, resource.resourceName)}/arn`,
                stringValue: role.roleArn
            })
        })
    };
}

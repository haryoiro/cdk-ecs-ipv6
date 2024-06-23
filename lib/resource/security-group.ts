import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSecurityGroupIngressProps, CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Fn } from "aws-cdk-lib";

interface IngressInfo {
    readonly id: string;
    readonly securityGroupIngressProps: CfnSecurityGroupIngressProps;
    readonly groupId: () => string;
    readonly sourceSecurityGroupId?: () => string;
}

interface SecurityGroupInfo {
    readonly id: string;
    readonly groupDescription: string;
    readonly ingresses: IngressInfo[];
    readonly resourceName: string;
    readonly assign: (securityGroup: CfnSecurityGroup) => void;
}

export class SecurityGroup extends Resource {
    public alb: CfnSecurityGroup;
    public rds: CfnSecurityGroup;
    public ecs: CfnSecurityGroup;

    private readonly vpc: CfnVPC;
    private readonly securityGroupInfo: SecurityGroupInfo[] = [
        {
            id: 'alb',
            groupDescription: 'alb',
            resourceName: 'alb-sg',
            ingresses: [
                {
                    id: 'http',
                    securityGroupIngressProps: {
                        ipProtocol: 'tcp',
                        cidrIp: '0.0.0.0/0',
                        fromPort: 80,
                        toPort: 80,
                    },
                    groupId: () => this.alb.attrGroupId,
                },
                {
                    id: 'https',
                    securityGroupIngressProps: {
                        ipProtocol: 'tcp',
                        cidrIp: '0.0.0.0/0',
                        fromPort: 443,
                        toPort: 443,
                    },
                    groupId: () => this.alb.attrGroupId,
                }
            ],
            assign: (securityGroup: CfnSecurityGroup) => { this.alb = securityGroup }
        },
        {
            id: 'ecs',
            groupDescription: 'ecs',
            resourceName: 'ecs-sg',
            ingresses: [
                {
                    id: 'api',
                    securityGroupIngressProps: {
                        ipProtocol: 'tcp',
                        fromPort: 3000,
                        toPort: 3000,
                    },
                    groupId: () => this.ecs.attrGroupId,
                    sourceSecurityGroupId: () => this.alb.attrGroupId,
                }
            ],
            assign: (securityGroup: CfnSecurityGroup) => { this.ecs = securityGroup }
        },
        {
            id: 'rds',
            groupDescription: 'rds',
            resourceName: 'rds-sg',
            ingresses: [
                {
                    id: 'mysql',
                    securityGroupIngressProps: {
                        ipProtocol: 'tcp',
                        fromPort: 3307,
                        toPort: 3307,
                    },
                    groupId: () => this.rds.attrGroupId,
                    sourceSecurityGroupId: () => this.ecs.attrGroupId,
                }
            ],
            assign: (securityGroup: CfnSecurityGroup) => { this.rds = securityGroup }
        }
    ]

    constructor(scope: Construct, id: string, vpc: CfnVPC) {
        super(scope, id)
        this.vpc = vpc;
        for (const resourceInfo of this.securityGroupInfo) {
            const securityGroup = this.createSecurityGroup(this, resourceInfo);
            resourceInfo.assign(securityGroup);

            this.createSecurityGroupIngress(this, resourceInfo);
        }
    };

    private createSecurityGroup(scope: Construct, securityGroupInfo: SecurityGroupInfo): CfnSecurityGroup {
        const resourceName = this.createResourceName(scope, securityGroupInfo.resourceName);
        const securityGroup = new CfnSecurityGroup(scope, securityGroupInfo.id, {
            groupDescription: securityGroupInfo.groupDescription,
            groupName: resourceName,
            vpcId: this.vpc.ref,
            tags: [{
                key: 'Name',
                value: resourceName
            }]
        });

        new StringParameter(scope, `${this.createResourceName(this, resourceName)}-sg-id}`, {
            parameterName: `/${this.createResourceName(this, resourceName)}/sg-id`,
            stringValue: Fn.getAtt(securityGroup.logicalId, 'GroupId').toString()
        })

        return securityGroup;
    }

    private createSecurityGroupIngress(scope: Construct, securityGroupInfo: SecurityGroupInfo) {
        for (const ingress of securityGroupInfo.ingresses) {
            const securityGroupIngress = new CfnSecurityGroupIngress(scope, ingress.id, ingress.securityGroupIngressProps);
            securityGroupIngress.groupId = ingress.groupId();

            if (ingress.sourceSecurityGroupId) {
                securityGroupIngress.sourceSecurityGroupId = ingress.sourceSecurityGroupId();
            }
        }
    }

}

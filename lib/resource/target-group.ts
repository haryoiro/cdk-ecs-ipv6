import { CfnTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";
import { Vpc } from "./vpc";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { ApplicationLoadBalancer } from "./alb";
import { Fn } from "aws-cdk-lib";

interface TargetGroupInfo {
    readonly resourceName: string;
    readonly port: number;
    readonly protocol: string;
    // tgが確定してからじゃないとlistenerにアタッチできないので、関数を渡しておく
    readonly attachListener?: (tg: CfnTargetGroup) => void;
    readonly assign: (tg: CfnTargetGroup) => void;
}

export class TargetGroups extends Resource {
    public app: CfnTargetGroup;

    private readonly vpc: Vpc;
    private readonly alb: ApplicationLoadBalancer;
    private readonly targetGroupInfoList: TargetGroupInfo[]

    constructor(scope: Construct, id: string, vpc: Vpc, alb: ApplicationLoadBalancer) {
        super(scope, id)
        this.vpc = vpc;
        this.alb = alb;
        this.targetGroupInfoList = [
            {
                resourceName: 'app-target-group',
                port: 80,
                protocol: 'HTTP',
                attachListener: (tg: CfnTargetGroup) => {
                    // HTTPはHTTPSにリダイレクト
                    this.alb.addListener({
                        port: 80,
                        protocol: 'HTTP',
                        actions: [{
                            type: 'redirect',
                            redirectConfig: {
                                protocol: 'HTTPS',
                                port: '443',
                                statusCode: 'HTTP_301'
                            }
                        }]
                    })
                    // HTTPSのリクエストをtgにフォワード
                    this.alb.addListener({
                        port: 443,
                        protocol: 'HTTPS',
                        actions: [{
                            type: 'forward',
                            targetGroupArn: tg.ref,
                        }],

                    })
                },
                assign: (targetGroup: CfnTargetGroup) => { this.app = targetGroup }
            }
        ]

        this.targetGroupInfoList.forEach(resource => {
            const targetGroup = new CfnTargetGroup(this, this.createResourceName(this, resource.resourceName), {
                name: this.createResourceName(this, resource.resourceName),
                port: resource.port,
                protocol: resource.protocol,
                targetType: 'ip',
                healthCheckPath: '/',
                healthCheckProtocol: 'HTTP',
                healthCheckPort: 'traffic-port',
                vpcId: this.vpc.vpc.ref,
                tags: [{ key: 'Name', value: this.createResourceName(this, resource.resourceName) }]
            });
            resource.assign(targetGroup);

            // ListenerにTargetGroupをアタッチ
            if (resource.attachListener) {
                resource.attachListener(targetGroup);
            }

            const arn = `arn:aws:elasticloadbalancing:ap-northeast-1:${this.getEnvValue(this).region}:targetgroup/${this.createResourceName(this, resource.resourceName)}/${targetGroup.ref}`
            // SubnetArnをSSMパラメータストアに保存
            new StringParameter(this, `${this.createResourceName(this, resource.resourceName)}-arn}`, {
                parameterName: `/${this.createResourceName(this, resource.resourceName)}/arn`,
                stringValue: arn,
            })
        })
    };
}

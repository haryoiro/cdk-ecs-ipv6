import { Tags } from 'aws-cdk-lib';

import { CfnListener, CfnLoadBalancer, CfnTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";
import { SecurityGroup } from "./security-group";
import { Subnet } from "./subnet";

interface ListenerInfo {
    readonly port: number;
    readonly protocol: "HTTP" | "HTTPS" | "TCP" | "TLS" | "UDP" | "TCP_UDP" | "GENEVE";
    readonly actions: CfnListener.ActionProperty[];
}

export class ApplicationLoadBalancer extends Resource {
    public lb: CfnLoadBalancer;

    constructor(
        scope: Construct,
        id: string,
        private readonly subnet: Subnet,
        private readonly securityGroup: SecurityGroup,
    ) {
        super(scope, id);

        this.lb = new CfnLoadBalancer(this, `ALB`, {
            name: this.createResourceName(this, "alb"),
            subnets: [
                this.subnet.public1a.ref,
                this.subnet.public1c.ref
            ],
            securityGroups: [
                this.securityGroup.alb.ref
            ],
            type: 'application',
            scheme: 'internet-facing',
            ipAddressType: 'dualstack', // IPv4とIPv6の両方を有効化
            tags: [{ key: 'Name', value: this.createResourceName(this, "alb") }],
        });
    }

    public addListener(listenerInfo: ListenerInfo): CfnListener {
        const listener = new CfnListener(this, `Listener${listenerInfo.port}`, {
            loadBalancerArn: this.lb.ref,
            port: listenerInfo.port,
            protocol: listenerInfo.protocol,
            defaultActions: listenerInfo.actions,
            // マネコンでデフォルトで指定されるSSLポリシー
            sslPolicy:listenerInfo.protocol == "HTTPS" ? 'ELBSecurityPolicy-TLS13-1-2-2021-06': undefined,
            certificates: listenerInfo.protocol == "HTTPS" ? [{
                certificateArn: this.getEnvValue(this).certificateArn
            }] : undefined,
        });
        return listener;
    }
}

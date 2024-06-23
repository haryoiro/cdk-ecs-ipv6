
import { CfnVPC, CfnVPCCidrBlock } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";
import { Fn } from "aws-cdk-lib";

export class Vpc extends Resource {
    public vpc: CfnVPC;
    public ipv6CidrBlock: CfnVPCCidrBlock;


    constructor(scope: Construct, id: string) {
        super(scope, id)
        this.vpc = new CfnVPC(this, 'VPC', {
            cidrBlock: '10.0.0.0/16',
            enableDnsHostnames: true,
            enableDnsSupport: true,
            instanceTenancy: 'default',
            tags: [{ key: 'Name', value: this.createResourceName(this, 'vpc') }]
        });

        // IPv6 CIDR ブロックをVPCに関連付ける
        this.ipv6CidrBlock = new CfnVPCCidrBlock(this, 'VpcIpv6CidrBlock', {
            vpcId: this.vpc.ref,
            // IPv6を有効化
            amazonProvidedIpv6CidrBlock: true
        });
    };

    public getIPv6Cidrs(): string[] {
        const vpcCidrBlock = Fn.select(0, this.vpc.attrIpv6CidrBlocks);
        const ipv6Cidrs = Fn.cidr(vpcCidrBlock, 256, '64');
        return ipv6Cidrs;
    }
}

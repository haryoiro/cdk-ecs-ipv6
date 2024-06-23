import { CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Resource } from './abstract/resource';
import { Fn } from 'aws-cdk-lib';
import { Vpc } from './vpc';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

interface SubnetInfo {
    readonly resourceName: string;
    readonly cidrBlock: string;
    readonly ipv6Suffix: string; // IPv6 CIDRブロックのサフィックス
    readonly availabilityZone: string;
    readonly mapPublicIpOnLaunch: boolean;
    readonly assign: (elasticIp: CfnSubnet) => void;
}

export class Subnet extends Resource {
    // public
    public public1a: CfnSubnet;
    public public1c: CfnSubnet;
    // private
    public app1a: CfnSubnet;
    public app1c: CfnSubnet;
    // private-isolated
    public db1a: CfnSubnet;
    public db1c: CfnSubnet;

    private readonly vpc: Vpc;
    private readonly subnetInfoList: SubnetInfo[] = [
        {
            resourceName: 'subnet-public-1a',
            cidrBlock: '10.0.11.0/24',
            ipv6Suffix: '00::/64',
            availabilityZone: 'ap-northeast-1a',
            mapPublicIpOnLaunch: true,
            assign: (subnet: CfnSubnet) => { this.public1a = subnet }
        },
        {
            resourceName: 'subnet-public-1c',
            cidrBlock: '10.0.12.0/24',
            ipv6Suffix: '01::/64',
            availabilityZone: 'ap-northeast-1c',
            mapPublicIpOnLaunch: true,
            assign: (subnet: CfnSubnet) => { this.public1c = subnet }
        },
        {
            resourceName: 'subnet-app-1a',
            cidrBlock: '10.0.21.0/24',
            ipv6Suffix: '10::/64',
            availabilityZone: 'ap-northeast-1a',
            mapPublicIpOnLaunch: false,
            assign: (subnet: CfnSubnet) => { this.app1a = subnet }
        },
        {
            resourceName: 'subnet-app-1c',
            cidrBlock: '10.0.22.0/24',
            availabilityZone: 'ap-northeast-1c',
            ipv6Suffix: '11::/64',
            mapPublicIpOnLaunch: false,
            assign: (subnet: CfnSubnet) => { this.app1c = subnet }
        },
        {
            resourceName: 'subnet-db-1a',
            cidrBlock: '10.0.31.0/24',
            ipv6Suffix: '20::/64',
            availabilityZone: 'ap-northeast-1a',
            mapPublicIpOnLaunch: false,
            assign: (subnet: CfnSubnet) => { this.db1a = subnet }
        },
        {
            resourceName: 'subnet-db-1c',
            cidrBlock: '10.0.32.0/24',
            ipv6Suffix: '21::/64',
            availabilityZone: 'ap-northeast-1c',
            mapPublicIpOnLaunch: false,
            assign: (subnet: CfnSubnet) => { this.db1c = subnet }
        },
    ]

    constructor(scope: Construct, id: string, vpc: Vpc) {
        super(scope, id)
        this.vpc = vpc;

        this.subnetInfoList.forEach((info, idx) => {
            const subnet = new CfnSubnet(this, this.createResourceName(this, info.resourceName), {
                vpcId: this.vpc.vpc.ref,
                cidrBlock: info.cidrBlock,
                ipv6CidrBlock: Fn.select(idx, this.vpc.getIPv6Cidrs()),
                availabilityZone: info.availabilityZone,
                mapPublicIpOnLaunch: info.mapPublicIpOnLaunch,
                assignIpv6AddressOnCreation: info.mapPublicIpOnLaunch,
                tags: [{ key: 'Name', value: this.createResourceName(this, info.resourceName) }]
            });
            info.assign(subnet);

            // IPv6 CIDRブロックが作成可能になるまで待つように依存関係を設定
            subnet.addDependency(this.vpc.ipv6CidrBlock);
            const arn = `arn:aws:ec2:${this.getEnvValue(this).region}:${this.getEnvValue(this).account}:subnet/${subnet.ref}`
            // SubnetArnをSSMパラメータストアに保存
            new StringParameter(this, `${this.createResourceName(this, info.resourceName)}-arn}`, {
                parameterName: `/${this.createResourceName(this, info.resourceName)}/arn`,
                stringValue: arn
            })
        });
    };
}

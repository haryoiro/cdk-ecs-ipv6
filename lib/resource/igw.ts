
import { CfnEIP, CfnInternetGateway, CfnVPC, CfnVPCGatewayAttachment } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";

interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly assign: (elasticIp: CfnEIP) => void;
}

export class InternetGateway extends Resource {
    public igw: CfnInternetGateway;

    private readonly vpc: CfnVPC

    constructor(scope: Construct, id: string, vpc: CfnVPC) {
        super(scope, id)
        this.vpc = vpc;
        this.igw = new CfnInternetGateway(this, 'InternetGateway', {
            tags: [{ key: 'Name', value: this.createResourceName(this, 'igw') }]
        });

        new CfnVPCGatewayAttachment(this, "IgwAttachment", {
            vpcId: this.vpc.ref,
            internetGatewayId: this.igw.ref,
        })
    };
}

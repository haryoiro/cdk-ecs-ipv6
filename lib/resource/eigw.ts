import { Construct } from "constructs";
import { Resource } from "./abstract/resource";
import { Vpc } from "./vpc";
import { CfnEgressOnlyInternetGateway } from "aws-cdk-lib/aws-ec2";
import { Tags } from "aws-cdk-lib";

export class EgressOnlyInternetGateway extends Resource {
    public eigw: CfnEgressOnlyInternetGateway;

    constructor(
        scope: Construct,
        id: string,
        private readonly vpc: Vpc
    ) {
        super(scope, id)
        // Egress-Only Internet Gatewayの作成
        this.eigw = new CfnEgressOnlyInternetGateway(this, 'EgressOnlyIGW', {
            vpcId: this.vpc.vpc.ref,
        });

        Tags.of(this.eigw).add('Name', this.createResourceName(this, 'eigw'));
    };

}

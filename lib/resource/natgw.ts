import { CfnEIP, CfnNatGateway } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Subnet } from "./subnet";
import { Resource } from "./abstract/resource";

export class NatGateway extends Resource {
    public ngw1a: CfnNatGateway;
    public ngw1c: CfnNatGateway;
    public eip1a: CfnEIP;
    public eip1c: CfnEIP;

    constructor(
        scope: Construct,
        id: string,
        private readonly subnet: Subnet,
    ) {
        super(scope,id)

        this.eip1a = new CfnEIP(this, 'Eip1a', {
            tags: [{ key: 'Name', value: this.createResourceName(this, 'eip-1a')}]
        });
        this.eip1c = new CfnEIP(this, 'Eip1c', {
            tags: [{ key: 'Name', value: this.createResourceName(this, 'eip-1c') }]
        });

        this.ngw1a = new CfnNatGateway(this, 'NatGateway1a', {
            allocationId: this.eip1a.attrAllocationId,
            subnetId: this.subnet.public1a.ref,
            tags: [{ key: 'Name', value: this.createResourceName(this, 'nat-gateway-1a') }]
        });
        this.ngw1c = new CfnNatGateway(this, 'NatGateway1c', {
            allocationId: this.eip1c.attrAllocationId,
            subnetId: this.subnet.public1c.ref,
            tags: [{ key: 'Name', value: this.createResourceName(this, 'nat-gateway-1c') }]
        });
    };

}

import { CfnDBSubnetGroup } from "aws-cdk-lib/aws-rds";
import { Subnet } from "./subnet";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";

export class Rds extends Resource {

    constructor(
        scope: Construct,
        id: string,
        private readonly subnet: Subnet,
    ) {
        super(scope, id);
        const subnetGroup = new CfnDBSubnetGroup(scope, 'SubnetGroupRds', {
            dbSubnetGroupDescription: 'Subnet Group for RDS',
            subnetIds: [
                this.subnet.db1a.ref,
                this.subnet.db1c.ref
            ],
            dbSubnetGroupName: this.createResourceName(scope, 'rds-subnet-group'),
            tags: [{ key: 'Name', value: this.createResourceName(scope, 'rds-subnet-group') }]
        });
    };

}

import { Subnet } from './subnet';
import { CfnRoute, CfnRouteTable, CfnSubnetRouteTableAssociation, CfnVPC, CfnEgressOnlyInternetGateway } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Resource } from './abstract/resource';
import { InternetGateway } from './igw';
import { NatGateway } from './natgw';
import { Vpc } from './vpc';
import { EgressOnlyInternetGateway } from './eigw';

interface RouteTableInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly subnetId: string;
    readonly routes: RouteInfo[];
    readonly assign: (routeTable: CfnRouteTable) => void;
}

interface RouteInfo {
    readonly id: string;
    readonly destinationCidrBlock?: string;
    readonly destinationIpv6CidrBlock?: string;
    readonly gatewayId?: string;
    readonly natGatewayId?: string;
    readonly egressOnlyInternetGatewayId?: string;
}

export class RouteTable extends Resource {
    public publicRouteTable1a: CfnRouteTable;
    public publicRouteTable1c: CfnRouteTable;
    public privateRouteTable1a: CfnRouteTable;
    public privateRouteTable1c: CfnRouteTable;
    public dbRouteTable1a: CfnRouteTable;
    public dbRouteTable1c: CfnRouteTable;

    private readonly resourceInfo: RouteTableInfo[];

    private createRouteTableInfoList(): RouteTableInfo[] {
        return [
            {
                id: 'RouteTablePublic1a',
                resourceName: 'public-route-table-1a',
                subnetId: this.subnet.public1a.ref,
                routes: [
                    {
                        id: 'PublicRoute1aIpv4',
                        destinationCidrBlock: '0.0.0.0/0', gatewayId: this.igw.igw.ref
                    },
                    { id: 'PublicRoute1aIpv6',
                        destinationIpv6CidrBlock: '::/0', gatewayId: this.igw.igw.ref }
                ],
                assign: (routeTable: CfnRouteTable) => { this.publicRouteTable1a = routeTable }
            },
            {
                id: 'RouteTablePublic1c',
                resourceName: 'public-route-table-1c',
                subnetId: this.subnet.public1c.ref,
                routes: [
                    {
                        id: 'PublicRoute1cIpv4',
                        destinationCidrBlock: '0.0.0.0/0',
                        gatewayId: this.igw.igw.ref
                    },
                    {
                        id: 'PublicRoute1cIpv6',
                        destinationIpv6CidrBlock: '::/0',
                        gatewayId: this.igw.igw.ref
                    }
                ],
                assign: (routeTable: CfnRouteTable) => { this.publicRouteTable1c = routeTable }
            },
            {
                id: 'RouteTablePrivate1a',
                resourceName: 'app-route-table-1a',
                subnetId: this.subnet.app1a.ref,
                routes: [
                    {
                        id: 'AppRoute1aIpv4',
                        destinationCidrBlock: '0.0.0.0/0', natGatewayId: this.ngw.ngw1a.ref
                    },
                    {
                        id: 'AppRoute1aIpv6',
                        destinationIpv6CidrBlock: '::/0', egressOnlyInternetGatewayId: this.eigw.eigw.ref
                    }
                ],
                assign: (routeTable: CfnRouteTable) => { this.privateRouteTable1a = routeTable }
            },
            {
                id: 'RouteTablePrivate1c',
                resourceName: 'app-route-table-1c',
                subnetId: this.subnet.app1c.ref,
                routes: [
                    {
                        id: 'AppRoute1cIpv4',
                        destinationCidrBlock: '0.0.0.0/0', natGatewayId: this.ngw.ngw1c.ref
                    },
                    {
                        id: 'AppRoute1cIpv6',
                        destinationIpv6CidrBlock: '::/0', egressOnlyInternetGatewayId: this.eigw.eigw.ref
                    }
                ],
                assign: (routeTable: CfnRouteTable) => { this.privateRouteTable1c = routeTable }
            },
            {
                id: 'RouteTableDb1a',
                resourceName: 'db-route-table-1a',
                subnetId: this.subnet.db1a.ref,
                routes: [],
                assign: (routeTable: CfnRouteTable) => { this.dbRouteTable1a = routeTable }
            },
            {
                id: 'RouteTableDb1c',
                resourceName: 'db-route-table-1c',
                subnetId: this.subnet.db1c.ref,
                routes: [],
                assign: (routeTable: CfnRouteTable) => { this.dbRouteTable1c = routeTable }
            }
        ];
    }


    constructor(
        scope: Construct,
        id: string,
        private readonly vpc: Vpc,
        private readonly igw: InternetGateway,
        private readonly eigw: EgressOnlyInternetGateway,
        private readonly ngw: NatGateway,
        private readonly subnet: Subnet
    ) {
        super(scope, id)
        this.createRouteTableInfoList().forEach(info => {
            const routeTable = new CfnRouteTable(this, info.id, {
                vpcId: this.vpc.vpc.ref,
                tags: [{ key: 'Name', value: this.createResourceName(this, info.resourceName) }]
            });

            // dbルートテーブルはルートがないため、ルートの設定をスキップ
            if (info.routes.length > 0) {
                info.routes.forEach(route => {
                    new CfnRoute(this, route.id, {
                        routeTableId: routeTable.ref,
                        destinationCidrBlock: route.destinationCidrBlock,
                        destinationIpv6CidrBlock: route.destinationIpv6CidrBlock,
                        gatewayId: route.gatewayId,
                        natGatewayId: route.natGatewayId,
                        egressOnlyInternetGatewayId: route.egressOnlyInternetGatewayId
                    });
                });
            }

            new CfnSubnetRouteTableAssociation(this, `${info.id}Association`, {
                routeTableId: routeTable.ref,
                subnetId: info.subnetId
            });

            info.assign(routeTable);
        });
    }

}

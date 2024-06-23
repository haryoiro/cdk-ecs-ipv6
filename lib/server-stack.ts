import { Vpc } from './resource/vpc';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Subnet } from './resource/subnet';
import { NatGateway } from './resource/natgw';
import { InternetGateway } from './resource/igw';
import { RouteTable } from './resource/route-table';
import { SecurityGroup } from './resource/security-group';
import { Repository } from './resource/repository';
import { ApplicationLoadBalancer } from './resource/alb';
import { LogGroups } from './resource/log-group';
import { EcsCluster } from './resource/ecs-cluster';
import { Roles } from './resource/role';
import { TargetGroups } from './resource/target-group';
import { EgressOnlyInternetGateway } from './resource/eigw';

export class ServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "VPC");

    const subnet = new Subnet(this, "Subnet", vpc);

    const ngw = new NatGateway(this, "NatGateway", subnet);
    const igw = new InternetGateway(this, "InternetGateway", vpc.vpc);
    const eigw = new EgressOnlyInternetGateway(this, "EgressOnlyInternetGateway", vpc);

    new RouteTable(this, "RouteTable", vpc, igw, eigw, ngw, subnet);

    const securityGroups = new SecurityGroup(this, "SecurityGroups", vpc.vpc);
    const roles = new Roles(this, 'Role');

    new Repository(this, 'Repository', roles);
    const logGroup = new LogGroups(this, 'LogGroup', roles);

    const alb = new ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', subnet, securityGroups);
    new TargetGroups(this, 'TargetGroups', vpc, alb);
    new EcsCluster(this, 'EcsCluster', logGroup);
  }
}

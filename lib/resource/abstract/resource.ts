import { Construct } from "constructs";

export type ContextValues = {
    systemName: string;
    env: string;
    region: string;
    account: string;
    certificateArn: string;
    domainName: string;
}

export abstract class Resource extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope,id)
    }

    protected getEnvValue(scope: any): ContextValues {
        const envKey = scope.node.tryGetContext('env');
        return scope.node.tryGetContext(envKey);
    }

    protected createResourceName(scope: any, name: string): string {
        const envKey = scope.node.tryGetContext('env');
        const envValue: ContextValues = scope.node.tryGetContext(envKey);
        const resourceNamePrefix = `${envValue.systemName}-`;

        return `${resourceNamePrefix}${name}`;
    }
}

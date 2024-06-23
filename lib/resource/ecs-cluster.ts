import { CfnCluster, ExecuteCommandLogging } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";
import { Vpc } from "./vpc";
import { LogGroups } from "./log-group";
import { CfnLogGroup, LogGroup } from "aws-cdk-lib/aws-logs";


interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly namespace: string;
    readonly enableExecuteCommand?: boolean;
    readonly logGroup?: CfnLogGroup;
    readonly assign: (cluster: CfnCluster) => void;
}

export class EcsCluster extends Resource {
    public app: CfnCluster;

    private readonly resources: ResourceInfo[]

    constructor(
        scope: Construct,
        id: string,
        private readonly logGroup: LogGroups
    ) {
        super(scope, id)

        this.resources = [
            {
                id: 'app',
                resourceName: 'app-cluster',
                namespace: 'app',
                enableExecuteCommand: true,
                logGroup: this.logGroup.ecsClusterEcsExecLogGroup,
                assign: (cluster: CfnCluster) => { this.app = cluster }
            }
        ]
        this.resources.forEach(resource => {
            const cluster = new CfnCluster(this, resource.id, {
                clusterName: this.createResourceName(this, resource.resourceName),
                serviceConnectDefaults: {
                    namespace: resource.namespace
                },
                configuration: {
                    executeCommandConfiguration: resource.enableExecuteCommand ? {
                        logging: ExecuteCommandLogging.OVERRIDE,
                        logConfiguration: {
                            cloudWatchLogGroupName: this.logGroup.ecsClusterEcsExecLogGroup.logGroupName,
                            cloudWatchEncryptionEnabled: true
                        }
                    } : undefined
                },
                tags: [{ key: 'Name', value: this.createResourceName(this, resource.resourceName)}]
            });

            if (resource.logGroup) {
                cluster.addDependency(resource.logGroup);
            }

            resource.assign(cluster);
        })
    };
}

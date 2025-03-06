import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';


import { Construct } from 'constructs';

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const projectPrefix = "Pokemon"

    // Create VPC
    const vpc = new ec2.Vpc(this, 'MyVpc');
    
    // Create an ECS Cluster
      const cluster = new ecs.Cluster(this, 'MyEcsCluster', {
        clusterName: `${id}-cluster`,
        vpc: vpc
      });
  
      /*
      new cdk.CfnOutput(this, 'EcsClusterName', {
        value: cluster.clusterName,
        description: 'Name of the ECS cluster',

      });
      */

      // Create a task execution role for the ECS task
      const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonECSTaskExecutionRolePolicy'
          ),
        ],
      });

      // Create a log group for container logs
      const logGroup = new logs.LogGroup(this, 'MyAppLogGroup', {
        retention: logs.RetentionDays.ONE_WEEK,  // You can configure the retention as needed
      });

      // Create an ECS Task Definition
      const taskDefinition = new ecs.FargateTaskDefinition(this, `${projectPrefix}-TaskDef`, {
        memoryLimitMiB: 512,  // Amount of memory (in MiB)
        cpu: 256,             // vCPU
        executionRole: taskExecutionRole,  // Role for pulling images and managing logs
      });

      // Add a container to the task definition
      const container = taskDefinition.addContainer(`${projectPrefix}-Container`, {
        image: ecs.ContainerImage.fromRegistry('775077707318.dkr.ecr.ca-central-1.amazonaws.com/oquirion/pokemon:latest'),
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: projectPrefix,  // Prefix for the log stream
          logGroup: logGroup,     // Attach the log group
        }),
        environment: {
          NODE_ENV: 'dev',  // Example environment variable
          /*
          REACT_APP_PLATFORM_URL: 'https://platform.cloud.coveo.com',
          REACT_APP_ORGANIZATION_ID: 'olivierquirionpokemonchallengegz2hprx2',
          REACT_APP_API_KEY: 'xxeae5698f-5f96-4aee-9570-652850853a16',
          REACT_APP_USER_EMAIL: 'olivierquirion@gmail.com',
          REACT_APP_PLATFORM_ENVIRONMENT: 'prod',
          PORT: '3000',
          REACT_APP_SERVER_PORT: '3001',
          REACT_APP_TOKEN_ENDPOINT: 'https://olivierquirionpokemonchallengegz2hprx2.org.coveo.com/rest/search/v2/token?organizationId=olivierquirionpokemonchallengegz2hprx2'        
*/
          },
      });

      // Optionally, map ports for the container (e.g., port 80)
      container.addPortMappings({
        name: "nodejs",
        containerPort: 3000
      });

      // Create an Application Load Balancer (ALB)
      const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'MyALB', {
        vpc,
        internetFacing: true,
      });

      // Create a listener for the ALB
      const listener = loadBalancer.addListener('MyListener', {
        port: 80,  // External port to listen on
        open: true,
      });

      // Create a target group for the Fargate service
      const targetGroup = new elbv2.ApplicationTargetGroup(this, 'MyTargetGroup', {
        vpc,
        targetType: elbv2.TargetType.IP,  // Use IP target type for Fargate tasks
        port: 3000,                       // Forward traffic to container's port 3000
        protocol: elbv2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: '/',                // Specify a health check endpoint
          interval: cdk.Duration.seconds(30),
        },
      });

      // Add the target group to the ALB listener
      listener.addTargetGroups('MyTarget', {
        targetGroups: [targetGroup],
      });

      // Create a Fargate service that uses the task definition and target group
      const service = new ecs.FargateService(this, 'MyFargateService', {
        cluster,
        taskDefinition,
        desiredCount: 1,  // Number of tasks to run
      });

      // Attach the Fargate service to the target group
      targetGroup.addTarget(service);
  }
}

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
    const vpc = new ec2.Vpc(this, `${projectPrefix}-vpc`);

    // Create a Security Group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      allowAllOutbound: true, // Ensures ALB can send traffic out
    });

    // Allow inbound HTTP traffic to ALB on port 80
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    
    // Security Group for ECS Tasks
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc,
    });

    // Allow ALB to send traffic to ECS on ports 8080 and 3000
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(8080), 'Allow ALB to reach ECS on 8080');
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow ALB to reach ECS on 3000');

    // Create an ECS Cluster
    const cluster = new ecs.Cluster(this, 'MyEcsCluster', {
      clusterName: `${projectPrefix}-cluster`,
      vpc: vpc,
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
      const logGroup = new logs.LogGroup(this, `${projectPrefix}-LogGroup`, {
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
        name: "nodejs-port-3000",
        containerPort: 3000
      },
      {
        name: "nginx-port-8080",
        containerPort: 8080,
      });

      // Create an Application Load Balancer (ALB)
      const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'MyALB', {
        vpc,
        internetFacing: true,
        securityGroup: albSecurityGroup,
      });

    // 👇 Target Group for Frontend (Nginx on 8080)
    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "FrontendTG",
      {
        vpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        port: 8080,
        targetType: elbv2.TargetType.IP,
        healthCheck: { path: "/" },
      }
    );

    // 👇 Target Group for Backend (Node.js on 3000)
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "BackendTG",
      {
        vpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        port: 3000,
        targetType: elbv2.TargetType.IP,
        healthCheck: { path: "/token" },
      }
    );

      // Create a listener for the ALB
      const httpListener  = loadBalancer.addListener('HttpListener', {
        port: 80,  // External port to listen on
        open: true,
        defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]),
      });

    // 👇 Route API calls (/api/*) to Backend (Node.js on 3000)
    httpListener.addAction("Route", {
      priority: 1,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/token*"])],
      action: elbv2.ListenerAction.forward([backendTargetGroup]),
    });

    httpListener.addAction("RouteAllOther", {
      priority: 100,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/*"])],
      action: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });

    // Create a Fargate service that uses the task definition and target group
    const service = new ecs.FargateService(this, 'MyFargateService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSecurityGroup],
    });

    service.node.addDependency(loadBalancer, ecsSecurityGroup, httpListener, frontendTargetGroup, backendTargetGroup);
    
    // Attach the ECS Service to Target Groups
    frontendTargetGroup.addTarget(service.loadBalancerTarget({
      containerName: `${projectPrefix}-Container`,
      containerPort: 8080,
    }));

    backendTargetGroup.addTarget(service.loadBalancerTarget({
      containerName: `${projectPrefix}-Container`,
      containerPort: 3000,
    }));
  }
}

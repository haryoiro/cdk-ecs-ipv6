#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerStack } from '../lib/server-stack';
import { ContextValues } from '../lib/resource/abstract/resource';

const app = new cdk.App();

const envKey = app.node.tryGetContext('env');
const envValue: ContextValues = app.node.tryGetContext(envKey);

new ServerStack(app, 'ServerStack', {
  env: {
    account: envValue.account,
    region: envValue.region,
  }
});

/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LogLevel } from '@tarko/interface';
import { AgentTARS } from '@agent-tars/core';
import { AgentServer } from '@tarko/agent-server';
import { IAgent } from '@tarko/agent-interface';
import { homedir } from 'os';
import path from 'path';
import {
  AgentTARSCLIArguments,
  AgentTARSAppConfig,
  BrowserControlMode,
  AGENT_TARS_CONSTANTS,
} from '@agent-tars/interface';
// Simple test configuration
const testConfig = {
  agent: {
    type: 'module',
    constructor: AgentTARS,
  },
  server: {
    port: 3001,
    storage: {
      type: 'sqlite',
      baseDir: path.join(homedir(), '.agent-tars', 'storage'),
      dbName: 'agent-tars.db',
    },
  },
  logLevel: LogLevel.DEBUG,
  model: {
    provider: 'openai',
    id: 'qwen-max',
    apiKey: 'YOUR_API_KEY',
    baseURL: process.env.OPENAI_BASE_URL,
  },
  config: {
    toolCallEngine: 'prompt_engineering',
    thinking: {
      type: 'disabled',
    },
    search: {
      provider: 'browser_search',
    },
  },
  directories: {
    globalWorkspaceDir: AGENT_TARS_CONSTANTS.GLOBAL_WORKSPACE_DIR,
  },
  workspace: path.join(homedir(), '.agent-tars', 'workspace'),
};

async function startServer() {
  console.log('Starting Agent Server for debugging...');

  const server = new AgentServer({
    appConfig: testConfig,
    isDebug: true,
    versionInfo: {
      version: '1.0.0',
      buildTime: Date.now().toString(),
      gitHash: 'dev',
    },
  });

  try {
    // Create workspace directory if it doesn't exist
    const { mkdirSync, existsSync } = await import('fs');
    const workspaceDir = testConfig.workspace;
    if (!existsSync(workspaceDir)) {
      mkdirSync(workspaceDir, { recursive: true });
      console.log(`Created workspace directory: ${workspaceDir}`);
    }

    const httpServer = await server.start();
    console.log(`\nAgent Server started successfully!`);
    console.log(`Server URL: http://localhost:3001`);
    console.log(`\nYou can now make requests to the API endpoints, e.g.:`);
    console.log(`- POST http://localhost:3001/api/sessions (create session)`);
    console.log(`- GET http://localhost:3001/api/system/info (system info)`);

    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\nStopping server...');
      await server.stop();
      console.log('Server stopped.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentTARS } from '@agent-tars/core';
import { AgentServer } from '@tarko/agent-server';
import { IAgent } from '@tarko/agent-interface';
import { homedir } from 'os';
import path from 'path';

// Mock agent implementation for testing
class MockAgent implements IAgent {
  constructor(options: any) {
    this.options = options;
    this.events = [];
  }

  private options: any;
  private events: any[];

  async initialize() {
    console.log('Mock agent initialized');
  }

  async run(input: any) {
    console.log('Mock agent run:', input);
    return {
      type: 'assistant_message',
      id: 'test-message-1',
      timestamp: Date.now(),
      content: 'This is a mock agent response',
      thinking: "I'm just a mock agent",
    };
  }

  abort() {
    return true;
  }

  status() {
    return 'ready';
  }

  async dispose() {
    console.log('Mock agent disposed');
  }

  getEventStream() {
    return {
      subscribe: (callback: any) => {
        return () => {};
      },
      emit: (event: any) => {
        this.events.push(event);
      },
    };
  }

  getTools() {
    return [];
  }

  getLLMClient() {
    return undefined;
  }

  async generateSummary(request: any) {
    return {
      summary: 'Mock summary',
    };
  }

  getCurrentModel() {
    return undefined;
  }

  async onLLMRequest(id: string, payload: any) {
    // Mock implementation
  }

  async onLLMResponse(id: string, payload: any) {
    // Mock implementation
  }

  onLLMStreamingResponse(id: string, payload: any) {
    // Mock implementation
  }

  async onBeforeToolCall(id: string, toolCall: any, args: any) {
    return args;
  }

  async onAfterToolCall(id: string, toolCall: any, result: any) {
    return result;
  }

  async onToolCallError(id: string, toolCall: any, error: any) {
    return error;
  }

  async onEachAgentLoopStart(sessionId: string) {
    // Mock implementation
  }

  async onEachAgentLoopEnd(context: any) {
    // Mock implementation
  }

  async onAgentLoopEnd(id: string) {
    // Mock implementation
  }

  async onProcessToolCalls(id: string, toolCalls: any[]) {
    return undefined;
  }

  async onBeforeLoopTermination(id: string, finalEvent: any) {
    return {
      shouldContinue: false,
    };
  }

  requestLoopTermination() {
    return true;
  }

  isLoopTerminationRequested() {
    return false;
  }

  getCurrentLoopIteration() {
    return 0;
  }

  getOptions() {
    return this.options;
  }

  async callLLM(params: any, options?: any) {
    return {
      id: 'test-llm-response',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mock LLM response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };
  }

  async onPrepareRequest(context: any) {
    return {
      systemPrompt: 'Mock system prompt',
      tools: [],
    };
  }
}

// Set static properties
MockAgent.label = 'TestAgent';
MockAgent.webuiConfig = {};

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
  workspace: path.join(homedir(), '.agent-tars', 'workspace'),
};

async function startServer() {
  console.log('Starting Agent Server for debugging...');

  const server = new AgentServer({
    appConfig: testConfig,
    versionInfo: {
      version: '1.0.0',
      buildTime: Date.now().toString(),
      gitHash: 'dev',
    },
  });

  try {
    const httpServer = await server.start();
    console.log(`\nAgent Server started successfully!`);
    console.log(`Server URL: http://localhost:3001`);
    console.log(`\nYou can now make requests to the API endpoints, e.g.:`);
    console.log(`- POST http://localhost:3001/api/sessions (create session)`);
    console.log(`- GET http://localhost:3001/api/system/info (system info)`);
    console.log(`\nPress Ctrl+C to stop the server.`);

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

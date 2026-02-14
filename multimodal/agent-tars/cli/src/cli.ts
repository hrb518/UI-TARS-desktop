/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

const packageJson = require('../package.json');
const { AgentTARSCLI } = require('./index');

new AgentTARSCLI({ version: packageJson.version }).bootstrap();

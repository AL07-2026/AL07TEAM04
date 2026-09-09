// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const functionsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(functionsDirectory);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

describe('accountApi deployment contract', () => {
  it('회원탈퇴 경로와 하위 경로를 catch-all보다 먼저 accountApi로 전달한다', async () => {
    const firebaseConfig = await readJson(path.join(projectDirectory, 'firebase.json'));
    const rewrites = firebaseConfig.hosting.rewrites;
    const accountRewrite = {
      source: '/api/account{,/**}',
      function: {
        functionId: 'accountApi',
        region: 'asia-northeast3',
      },
    };

    expect(rewrites).toContainEqual(accountRewrite);
    expect(rewrites.indexOf(rewrites.find(({ source }) => source === accountRewrite.source))).toBeLessThan(
      rewrites.findIndex(({ source }) => source === '/api/**'),
    );
  });

  it('accountApi를 코드 옵션과 같은 Secret 없는 2세대 함수로 선언한다', async () => {
    const manifest = await readJson(path.join(functionsDirectory, 'functions.yaml'));

    expect(manifest.endpoints.accountApi).toEqual({
      availableMemoryMb: 256,
      timeoutSeconds: 120,
      minInstances: null,
      maxInstances: 10,
      ingressSettings: null,
      concurrency: 20,
      serviceAccountEmail: null,
      vpc: null,
      platform: 'gcfv2',
      region: ['asia-northeast3'],
      labels: {},
      httpsTrigger: {},
      entryPoint: 'accountApi',
    });
    expect(manifest.endpoints.accountApi).not.toHaveProperty('secretEnvironmentVariables');
  });
});

describe('applicationEmailApi deployment contract', () => {
  it('지원 메일 경로를 catch-all보다 먼저 전용 함수로 전달한다', async () => {
    const firebaseConfig = await readJson(path.join(projectDirectory, 'firebase.json'));
    const rewrites = firebaseConfig.hosting.rewrites;
    const emailRewrite = {
      source: '/api/applications/send',
      function: {
        functionId: 'applicationEmailApi',
        region: 'asia-northeast3',
      },
    };

    expect(rewrites).toContainEqual(emailRewrite);
    expect(rewrites.indexOf(rewrites.find(({ source }) => source === emailRewrite.source))).toBeLessThan(
      rewrites.findIndex(({ source }) => source === '/api/**'),
    );
  });

  it('Gmail Secret을 메일 함수에만 격리한다', async () => {
    const manifest = await readJson(path.join(functionsDirectory, 'functions.yaml'));
    const { api } = await import('./index.mjs');
    const emailEndpoint = manifest.endpoints.applicationEmailApi;
    const commonSecretKeys = (manifest.endpoints.api.secretEnvironmentVariables || []).map(
      ({ key }) => key,
    );
    const runtimeCommonSecretKeys = (api.__endpoint.secretEnvironmentVariables || []).map(
      ({ key }) => key,
    );

    expect(emailEndpoint).toMatchObject({
      availableMemoryMb: 512,
      concurrency: 4,
      entryPoint: 'applicationEmailApi',
      maxInstances: 10,
      platform: 'gcfv2',
      region: ['asia-northeast3'],
      secretEnvironmentVariables: [{ key: 'GMAIL_APP_PASSWORD' }],
      timeoutSeconds: 120,
    });
    expect(commonSecretKeys).toEqual(['ASSEMBLYAI_API_KEY', 'GEMINI_API_KEY']);
    expect(runtimeCommonSecretKeys).toEqual(commonSecretKeys);
  });
});

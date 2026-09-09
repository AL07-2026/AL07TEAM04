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
  it('Gmail Secret 준비 전에는 전용 함수와 Hosting rewrite를 활성화하지 않는다', async () => {
    const firebaseConfig = await readJson(path.join(projectDirectory, 'firebase.json'));
    const manifest = await readJson(path.join(functionsDirectory, 'functions.yaml'));
    const rewrites = firebaseConfig.hosting.rewrites;
    expect(
      rewrites.find((rewrite) => rewrite.function?.functionId === 'applicationEmailApi'),
    ).toBeUndefined();
    expect(manifest.endpoints.applicationEmailApi).toBeUndefined();
  });

  it('준비된 메일 함수만 Gmail Secret을 요구하고 공통 API는 요구하지 않는다', async () => {
    const manifest = await readJson(path.join(functionsDirectory, 'functions.yaml'));
    const { applicationEmailApi } = await import('./application-email-entry.mjs');
    const { api } = await import('./index.mjs');
    const commonSecretKeys = (manifest.endpoints.api.secretEnvironmentVariables || []).map(
      ({ key }) => key,
    );
    const emailSecretKeys = (
      applicationEmailApi.__endpoint.secretEnvironmentVariables || []
    ).map(({ key }) => key);
    const runtimeCommonSecretKeys = (api.__endpoint.secretEnvironmentVariables || []).map(
      ({ key }) => key,
    );

    expect(applicationEmailApi.__endpoint).toMatchObject({
      availableMemoryMb: 512,
      concurrency: 4,
      maxInstances: 10,
      timeoutSeconds: 120,
    });
    expect(emailSecretKeys).toEqual(['GMAIL_APP_PASSWORD']);
    expect(commonSecretKeys).toEqual(['ASSEMBLYAI_API_KEY', 'GEMINI_API_KEY']);
    expect(runtimeCommonSecretKeys).toEqual(commonSecretKeys);
  });
});

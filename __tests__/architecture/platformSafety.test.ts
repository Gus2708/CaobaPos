import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Guards the app against APIs that silently do nothing on one of the platforms we
 * ship to (iOS, Android and the PWA). The bug that motivated this test: every
 * confirmation used `Alert.alert`, which react-native-web implements as an empty
 * function, so destructive actions were unreachable in the PWA.
 */
const PROJECT_ROOT = join(__dirname, '..', '..');
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib', 'store'];
const SOURCE_FILES = ['App.tsx'];

interface BannedApi {
  name: string;
  /** Project-relative paths (posix separators) allowed to use it. */
  allowedIn: string[];
  reason: string;
}

const BANNED_APIS: BannedApi[] = [
  {
    name: 'Alert',
    allowedIn: ['lib/dialog.ts'],
    reason:
      'Alert.alert is a no-op on react-native-web and the app ships as a PWA. Use showDialog() from lib/dialog.',
  },
  {
    name: 'ToastAndroid',
    allowedIn: [],
    reason: 'ToastAndroid only exists on Android. Use showToast() from components/Toast.',
  },
  {
    name: 'ActionSheetIOS',
    allowedIn: [],
    reason:
      'ActionSheetIOS only exists on iOS. Use showDialog() from lib/dialog with one button per option.',
  },
];

const REACT_NATIVE_IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]react-native['"]/g;

const lineAt = (source: string, index: number) => source.slice(0, index).split('\n').length;

export function findViolations(source: string, filePath: string): string[] {
  const violations: string[] = [];

  for (const api of BANNED_APIS) {
    if (api.allowedIn.includes(filePath)) continue;

    REACT_NATIVE_IMPORT.lastIndex = 0;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = REACT_NATIVE_IMPORT.exec(source)) !== null) {
      const imported = importMatch[1]
        .split(',')
        .map((name) => name.trim().split(/\s+as\s+/)[0].trim());
      if (imported.includes(api.name)) {
        violations.push(
          `${filePath}:${lineAt(source, importMatch.index)} imports ${api.name} from react-native. ${api.reason}`
        );
      }
    }

    const usage = new RegExp(String.raw`\b${api.name}\s*\.\s*\w+\s*\(`, 'g');
    let usageMatch: RegExpExecArray | null;
    while ((usageMatch = usage.exec(source)) !== null) {
      violations.push(
        `${filePath}:${lineAt(source, usageMatch.index)} calls ${usageMatch[0].trim()} ${api.reason}`
      );
    }
  }

  return violations;
}

function collectSourceFiles(): string[] {
  const files: string[] = SOURCE_FILES.map((file) => join(PROJECT_ROOT, file));

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (/\.tsx?$/.test(entry) && !/\.d\.ts$/.test(entry)) files.push(fullPath);
    }
  };

  for (const dir of SOURCE_DIRS) walk(join(PROJECT_ROOT, dir));
  return files;
}

describe('platform safety scanner', () => {
  it('flags a single-line react-native import', () => {
    expect(findViolations(`import { View, Alert } from 'react-native';`, 'components/Foo.tsx')).toEqual([
      expect.stringContaining('components/Foo.tsx:1 imports Alert'),
    ]);
  });

  it('flags a multi-line react-native import', () => {
    const source = ['import {', '  View,', '  Alert,', "} from 'react-native';"].join('\n');

    expect(findViolations(source, 'components/Foo.tsx')).toEqual([
      expect.stringContaining('components/Foo.tsx:1 imports Alert'),
    ]);
  });

  it('flags a namespaced call even without a named import', () => {
    const source = ["import * as RN from 'react-native';", "RN.Alert.alert('Hola');"].join('\n');

    expect(findViolations(source, 'components/Foo.tsx')).toEqual([
      expect.stringContaining('components/Foo.tsx:2 calls Alert.alert('),
    ]);
  });

  it('accepts showDialog and allows the dialog module itself', () => {
    expect(findViolations(`import { showDialog } from '../lib/dialog';`, 'components/Foo.tsx')).toEqual([]);
    expect(
      findViolations(`import { Alert } from 'react-native';\nAlert.alert('x');`, 'lib/dialog.ts')
    ).toEqual([]);
  });
});

describe('app source', () => {
  it('never reaches for APIs that do nothing on one of our platforms', () => {
    const violations = collectSourceFiles().flatMap((file) =>
      findViolations(readFileSync(file, 'utf8'), relative(PROJECT_ROOT, file).split(sep).join('/'))
    );

    expect(violations).toEqual([]);
  });
});

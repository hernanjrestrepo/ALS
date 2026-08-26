import { useState, useEffect, useCallback } from 'react';
import {
  type TemplateTest,
  type TemplateTestComment,
  type TestsExport,
  TEMPLATE_TEST_ITEMS,
  type TestStatus,
  type CommentPriority,
} from '@/types/testing';

const STORAGE_KEY = 'als_template_tests_v1';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getInitialTests(): TemplateTest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TemplateTest[];
      // Merge with known templates to ensure new ones appear
      const knownIds = new Set(parsed.map((t) => t.templateId));
      const missing = TEMPLATE_TEST_ITEMS.filter((item) => !knownIds.has(item.templateId));
      return [
        ...parsed,
        ...missing.map((item) => ({
          ...item,
          status: 'pending' as TestStatus,
          hasErrors: false,
          comments: [],
        })),
      ];
    }
  } catch (error) {
    console.warn('[useTemplateTests] estado guardado invalido en localStorage, se reinicia', error);
  }
  return TEMPLATE_TEST_ITEMS.map((item) => ({
    ...item,
    status: 'pending' as TestStatus,
    hasErrors: false,
    comments: [],
  }));
}

export function useTemplateTests() {
  const [tests, setTests] = useState<TemplateTest[]>(getInitialTests);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    }
  }, [tests, isLoaded]);

  const updateStatus = useCallback((templateId: string, status: TestStatus) => {
    setTests((prev) =>
      prev.map((t) =>
        t.templateId === templateId
          ? { ...t, status, lastTestedAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const toggleErrors = useCallback((templateId: string) => {
    setTests((prev) =>
      prev.map((t) =>
        t.templateId === templateId ? { ...t, hasErrors: !t.hasErrors } : t
      )
    );
  }, []);

  const addComment = useCallback(
    (templateId: string, text: string, field?: string, priority: CommentPriority = 'medium') => {
      const comment: TemplateTestComment = {
        id: generateId(),
        text,
        field,
        priority,
        createdAt: new Date().toISOString(),
      };
      setTests((prev) =>
        prev.map((t) =>
          t.templateId === templateId
            ? { ...t, comments: [...t.comments, comment] }
            : t
        )
      );
    },
    []
  );

  const removeComment = useCallback((templateId: string, commentId: string) => {
    setTests((prev) =>
      prev.map((t) =>
        t.templateId === templateId
          ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
          : t
      )
    );
  }, []);

  const exportTests = useCallback((userName?: string): TestsExport => {
    return {
      exportedAt: new Date().toISOString(),
      exportedBy: userName,
      version: '1.0',
      tests: tests.map((t) => ({
        ...t,
        // Ensure we don't export undefined values
        lastTestedAt: t.lastTestedAt || undefined,
        testedBy: t.testedBy || undefined,
      })),
    };
  }, [tests]);

  const stats = {
    total: tests.length,
    pending: tests.filter((t) => t.status === 'pending').length,
    tested: tests.filter((t) => t.status === 'tested').length,
    failed: tests.filter((t) => t.status === 'failed').length,
    withErrors: tests.filter((t) => t.hasErrors).length,
    totalComments: tests.reduce((acc, t) => acc + t.comments.length, 0),
  };

  return {
    tests,
    isLoaded,
    stats,
    updateStatus,
    toggleErrors,
    addComment,
    removeComment,
    exportTests,
  };
}

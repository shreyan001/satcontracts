"use client";

import { StreamableValue, useStreamableValue } from "ai/rsc";
import ReactMarkdown from 'react-markdown';

export function AIMessageText({ content }: { content: string }) {
  return (
    <div className="bg-gray-900 text-white p-4 rounded-sm mb-4 max-w-2xl">
      <ReactMarkdown className="prose prose-invert max-w-none">
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function HumanMessageText({ content }: { content: string }) {
  return (
    <div className="bg-blue-600 text-white p-4 rounded-sm mb-4 max-w-2xl">
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function AIMessage(props: { value: StreamableValue<string> }) {
  const [data] = useStreamableValue(props.value);

  if (!data) {
    return null;
  }
  return <AIMessageText content={data} />;
}

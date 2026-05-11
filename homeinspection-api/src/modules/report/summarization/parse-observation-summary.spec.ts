import { SummarizationProviderError } from './ai-summarizer.port';
import { parseObservationSummaryFromAssistantText } from './parse-observation-summary';

describe('parseObservationSummaryFromAssistantText', () => {
  const valid = {
    executiveSummary: 'Roof issues dominate the supplied notes.',
    prioritizedItems: [
      {
        rank: 1,
        title: 'Roof damage',
        rationale: 'Missing shingles were called out in the observations.',
      },
      {
        rank: 2,
        title: 'Follow up',
        rationale: 'Confirm repairs with a licensed roofer.',
      },
    ],
  };

  it('parses bare JSON', () => {
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(valid)),
    ).toEqual(valid);
  });

  it('parses JSON wrapped in a markdown code fence', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(valid, null, 2)}\n\`\`\``;
    expect(parseObservationSummaryFromAssistantText(fenced)).toEqual(valid);
  });

  it('sorts prioritizedItems by ascending rank regardless of input order', () => {
    const outOfOrder = {
      executiveSummary: 'Two items, ranks reversed in array.',
      prioritizedItems: [
        {
          rank: 2,
          title: 'Second priority',
          rationale: 'Comes second.',
        },
        {
          rank: 1,
          title: 'First priority',
          rationale: 'Comes first.',
        },
      ],
    };
    const expected = {
      executiveSummary: outOfOrder.executiveSummary,
      prioritizedItems: [
        outOfOrder.prioritizedItems[1],
        outOfOrder.prioritizedItems[0],
      ],
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(outOfOrder)),
    ).toEqual(expected);
  });

  it('accepts empty prioritizedItems when summary is present', () => {
    const minimal = {
      executiveSummary: 'No observations were supplied.',
      prioritizedItems: [],
    };
    expect(
      parseObservationSummaryFromAssistantText(JSON.stringify(minimal)),
    ).toEqual(minimal);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseObservationSummaryFromAssistantText('not json')).toThrow(
      SummarizationProviderError,
    );
  });

  it('rejects non-object root', () => {
    expect(() => parseObservationSummaryFromAssistantText('"hello"')).toThrow(
      SummarizationProviderError,
    );
  });

  it('rejects missing executiveSummary', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({ prioritizedItems: [] }),
      ),
    ).toThrow(SummarizationProviderError);
  });

  it('rejects empty executiveSummary', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: '   ',
          prioritizedItems: [],
        }),
      ),
    ).toThrow(SummarizationProviderError);
  });

  it('rejects duplicate or gapped ranks', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [
            { rank: 1, title: 'a', rationale: 'b' },
            { rank: 1, title: 'c', rationale: 'd' },
          ],
        }),
      ),
    ).toThrow(SummarizationProviderError);

    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [
            { rank: 1, title: 'a', rationale: 'b' },
            { rank: 3, title: 'c', rationale: 'd' },
          ],
        }),
      ),
    ).toThrow(SummarizationProviderError);
  });

  it('rejects empty title or rationale', () => {
    expect(() =>
      parseObservationSummaryFromAssistantText(
        JSON.stringify({
          executiveSummary: 'x',
          prioritizedItems: [{ rank: 1, title: '', rationale: 'ok' }],
        }),
      ),
    ).toThrow(SummarizationProviderError);
  });
});

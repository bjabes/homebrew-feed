export const formulaFixture = {
  name: "wget",
  full_name: "wget",
  versions: {
    stable: "1.25.0"
  },
  revision: 0,
  urls: {
    stable: {
      checksum: "formula-checksum-1"
    }
  }
};

export const formulaRevisionFixture = {
  ...formulaFixture,
  revision: 1
};

export const caskFixture = {
  token: "visual-studio-code",
  name: ["Visual Studio Code"],
  version: "1.98.0",
  sha256: "cask-checksum-1"
};

export const latestCaskFixture = {
  token: "orbstack",
  name: ["OrbStack"],
  version: "latest",
  sha256: "no_check"
};

export const dayOneFormulae = [
  formulaFixture
];

export const dayOneCasks = [
  caskFixture
];

export const dayTwoFormulae = [
  formulaRevisionFixture,
  {
    name: "ripgrep",
    full_name: "ripgrep",
    versions: {
      stable: "14.1.1"
    },
    revision: 0,
    urls: {
      stable: {
        checksum: "formula-checksum-2"
      }
    }
  }
];

export const dayTwoCasks = [
  {
    ...caskFixture,
    version: "1.99.0"
  }
];

export const recentFeedItems = [
  {
    date: "2026-03-06",
    kind: "formula",
    token: "ripgrep",
    name: "ripgrep",
    changeType: "new",
    currentVersion: "14.1.1",
    previousVersion: null,
    packageUrl: "https://formulae.brew.sh/formula/ripgrep"
  },
  {
    date: "2026-03-06",
    kind: "formula",
    token: "wget",
    name: "wget",
    changeType: "updated",
    currentVersion: "1.25.0_1",
    previousVersion: "1.25.0",
    packageUrl: "https://formulae.brew.sh/formula/wget"
  },
  {
    date: "2026-03-04",
    kind: "cask",
    token: "visual-studio-code",
    name: "Visual Studio Code",
    changeType: "updated",
    currentVersion: "1.99.0",
    previousVersion: "1.98.0",
    packageUrl: "https://formulae.brew.sh/cask/visual-studio-code"
  },
  {
    date: "2026-02-12",
    kind: "cask",
    token: "orbstack",
    name: "OrbStack",
    changeType: "new",
    currentVersion: "latest",
    previousVersion: null,
    packageUrl: "https://formulae.brew.sh/cask/orbstack"
  }
] as const;

export const sampleFeedData = {
  generatedAt: "2026-03-06T14:00:00.000Z",
  latestSnapshotDate: "2026-03-06",
  items: [...recentFeedItems]
};

export const sampleMetaData = {
  generatedAt: "2026-03-06T14:00:00.000Z",
  latestSnapshotDate: "2026-03-06",
  snapshotCount: 3,
  itemCount: 4,
  windowCounts: {
    today: 2,
    week: 3,
    month: 4
  }
};

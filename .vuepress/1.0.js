module.exports = [
  {
    title: "Getting Started",
    collapsable: false,
    children: prefix('getting-started', [
      '',
      'installation',
      'core-concepts',
      'directory-structure',
    ]),
  },
  {
    title: "Servers",
    collapsable: false,
    children: prefix('servers', [
      '',
      'events',
    ]),
  },
  {
    title: "Schemas",
    collapsable: false,
    children: prefix('schemas', [
      '',
      'identifier',
      'attributes',
      'relationships',
    ]),
  }
];

function prefix(prefix, children) {
    return children.map(child => `${prefix}/${child}`)
}

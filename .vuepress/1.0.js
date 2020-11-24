module.exports = [
  {
    title: "Getting Started",
    collapsable: false,
    children: prefix('getting-started', [
      '',
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
  },
  {
    title: 'API Resources',
    collapsable: false,
    children: prefix('resources', [
      '',
      'attributes',
      'relationships',
      'meta',
      'links',
    ]),
  },
  {
    title: "Routing",
    collapsable: false,
    children: prefix('routing', [
      '',
      'controllers'
    ]),
  }
];

function prefix(prefix, children) {
    return children.map(child => `${prefix}/${child}`)
}

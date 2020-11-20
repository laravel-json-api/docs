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
    ]),
  },
  {
    title: "Schemas",
    collapsable: false,
    children: prefix('schemas', [
      '',
    ]),
  }
];

function prefix(prefix, children) {
    return children.map(child => `${prefix}/${child}`)
}

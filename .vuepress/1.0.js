module.exports = [
  {
    title: 'Getting Started',
    collapsable: false,
    children: prefix('getting-started', [
      '',
      'core-concepts',
      'directory-structure',
    ]),
  },
  {
    title: 'Tutorial',
    collapsable: true,
    children: prefix('tutorial', [
      '',
      '02-models',
      '03-server-and-schemas',
      '04-relationships',
      '05-creating-resources',
      '06-modifying-resources',
      '07-deleting-resources',
      '08-fetching-resources',
    ]),
  },
  {
    title: 'Servers',
    collapsable: false,
    children: prefix('servers', [
      '',
      'events',
    ]),
  },
  {
    title: 'Schemas',
    collapsable: false,
    children: prefix('schemas', [
      '',
      'identifier',
      'attributes',
      'relationships',
      'eager-loading',
      'sorting',
      'pagination',
      'filters',
      'soft-deleting',
    ]),
  },
  {
    title: 'Routing',
    collapsable: false,
    children: prefix('routing', [
      '',
      'controllers',
      'writing-actions',
      'custom-actions',
    ]),
  },
  {
    title: 'Requests',
    collapsable: false,
    children: prefix('requests', [
      '',
      'authorization',
      'compliance',
      'resources',
      'query-parameters',
    ]),
  },
  {
    title: 'Responses',
    collapsable: false,
    children: prefix('responses', [
      '',
      'errors',
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
    title: 'Digging Deeper',
    collapsable: false,
    children: prefix('digging-deeper', [
      'artisan',
      'countable',
      'localisation',
      'proxies',
      'non-eloquent',
      'polymorphic-to-many',
    ]),
  },
  {
    title: 'Testing',
    collapsable: false,
    children: prefix('testing', [
      '',
      'resources',
      'relationships',
      'requests',
      'assertions',
    ]),
  }
];

function prefix(prefix, children) {
    return children.map(child => `${prefix}/${child}`)
}

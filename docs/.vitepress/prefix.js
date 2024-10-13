export default function (base, path, children) {
    return children.map(({text, link}) => ({
        text,
        link: `${base}/${path}/${link}`,
    }))
};
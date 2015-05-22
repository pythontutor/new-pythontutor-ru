import re
from django import template
from django.template.loader import render_to_string

import markdown
from markdown import Extension
from markdown.preprocessors import Preprocessor
from markdown.treeprocessors import Treeprocessor
from markdown.extensions.extra import ExtraExtension
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.smarty import SmartyExtension
from markdown.extensions.toc import TocExtension
from markdown.util import etree
from mkdcomments import CommentsExtension


register = template.Library()


# TODO refactor all this shit
class CodeSampleProcessor(Preprocessor):
    """
    Process code sample blocks:

    @@@[executable]
    [code]
    @@@
    [sample input]
    @@@
    """
    RE = re.compile(
        r'^@@@(?P<executable>executable)?\n(?P<code>.*?)(?<=\n)@@@\n(?P<input>.*?)@@@$',
        re.MULTILINE | re.DOTALL | re.VERBOSE
    )  # TODO [at] looks weird

    def _replace(self, match):
        data = match.groupdict()

        code = render_to_string('includes/code.html', {
            'executable': 'executable' in data,
            'input_data': data['input'],
            'code': data['code']
        })
        return self.markdown.htmlStash.store(code, safe=True)

    def run(self, lines):
        text = "\n".join(lines)

        return self.RE.sub(self._replace, text).split('\n')


class CodeSampleExtension(Extension):
    """
    Add code sample block support to Markdown
    """
    def extendMarkdown(self, md, md_globals):
        md.registerExtension(self)

        md.preprocessors.add(
            'codesample',
            CodeSampleProcessor(md),
            ">normalize_whitespace",
        )


class BoostrapifyProcessor(Treeprocessor):
    def run(self, root):
        for elem in root.iter('table'):
            elem.attrib['class'] = 'table table-striped table-hover'


class BootstrapifyExtension(Extension):
    """
    Add bootstrap classes to result HTML elements
    """
    def extendMarkdown(self, md, md_globals):
        md.registerExtension(self)

        md.treeprocessors.add(
            'bootstrapify',
            BoostrapifyProcessor(md),
            "_end",
        )


markdown_extensions = [
    SmartyExtension(),
    ExtraExtension(),
    FencedCodeExtension(),
    CodeSampleExtension(),
    CommentsExtension(),
    BootstrapifyExtension(),
]
markdown_no_toc = markdown.Markdown(extensions=markdown_extensions)
markdown_toc = markdown.Markdown(extensions=markdown_extensions + [
    TocExtension(marker='[table-of-contents]', anchorlink=True),
])


@register.filter()
def markdownify(text):
    try:
        return markdown_no_toc.convert(text)
    finally:
        markdown_no_toc.reset()


@register.filter()
def markdownify_toc(text):
    try:
        return markdown_toc.convert(
            '[table-of-contents]\n\n{0}'.format(text)
        )
    finally:
        markdown_toc.reset()

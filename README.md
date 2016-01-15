# go-refugeerights

Refugee Rights Javascript for Vumi Go


## Quickstart

::

    $ npm install
    $ npm test


## Building translations

Translations are extracted and built using
[jspot](https://github.com/praekelt/jspot).

After installing `jspot` with

::

  $ npm install -g jspot

translation happens as follows:

1. Generate the `.pot` template files with `./utils/regenerate-pot.sh`. This
   will write a `messages.pot` file into `translations/<app-name>` for each
   application with translations.

2. Send the `.pot` files to translators.

3. Translators should return a `<language>.po` file for each application. For
   example, a Xhosa translation file might be called `xh.po`.

4. Copy the language specific `.po` files into the translation folder of
   each application, along side the `messages.pot` file it was created from.

5. Run `./utils-regenerate-json.sh` to generate JSON translation files from
   the `.po` files.

6. Deploy the new JSON files.

The `.pot` and `.po` formats are defined as part of the
[gettext](https://www.gnu.org/software/gettext/) standard and many tools
exist for working with them.

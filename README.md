# Unity - Activate
[![Actions status](https://github.com/webbertakken/unity-activate/workflows/Actions%20%F0%9F%98%8E/badge.svg)](https://github.com/webbertakken/unity-activate/actions?query=branch%3Amaster+workflow%3A"Actions+😎")

---

GitHub Action to [activate Unity](https://github.com/marketplace/actions/unity-activate). 

Part of the [Unity Actions](https://github.com/webbertakken/unity-actions) collection.

---

Use this action to activate Unity using credentials or a license file. Both 
**personal** and **professional** licenses are supported.

When successfully activated, you will be able to run the 
[Test](https://github.com/webbertakken/unity-actions#test) and
[Build](https://github.com/webbertakken/unity-actions#build)
actions.

### Documentation

See the 
[Unity Actions](https://github.com/webbertakken/unity-actions)
collection repository for workflow documentation and reference implementation.

## Usage

Create or edit the file called `.github/workflows/activation.yml` and add a job to it.
 
```yaml
name: Activate Unity
on: [push]
jobs:
  requestActivation:
    name: Request activation ✔
    runs-on: ubuntu-latest
    steps:
```

Continue to either the personal license or professional license section below.

#### Personal license

1. Follow the **activation** section from [request action](https://github.com/marketplace/actions/unity-request-activation-file) to set `UNITY_LICENSE` variable.
2. Use the action as follows:

```yaml
- name: Activate Unity
  uses: webbertakken/unity-activate@v1
  env:
    UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
```

#### Professional license

1. Goto `Repository` > `Settings` > `Secrets`
2. Set the following secrets:
    - `UNITY_EMAIL`: &lt;your_unity_login_email_address&gt;
    - `UNITY_PASSWORD`: &lt;your_unity_login_password&gt;
    - `UNITY_SERIAL`: &lt;your_unity_serial&gt;
3. Use the action as follows:

```yaml
- name: Activate Unity
  uses: webbertakken/unity-activate@v1
  env:
    UNITY_EMAIL:    ${{ secrets.UNITY_EMAIL }}
    UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
    UNITY_SERIAL:   ${{ secrets.UNITY_SERIAL }}
```

## More actions

Visit 
[Unity Actions](https://github.com/webbertakken/unity-actions) 
to find related actions for Unity.

Feel free to contribute.

## Licence 

[MIT](./LICENSE)

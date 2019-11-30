# Unity - Activate
[![Actions status](https://github.com/WebberTakken/unity-activate/workflows/Actions%20%F0%9F%98%8E/badge.svg)](https://github.com/WebberTakken/unity-activate/workflows/Actions%20%F0%9F%98%8E/badge.svg)

[Github Action](https://github.com/features/actions)
to activate Unity using credentials or a license file. Both **personal** and 
**professional** licenses are supported.

Use this action to verify whether your license file is correctly configured. If 
so, you will be able to run the 
[Test](https://github.com/webbertakken/unity-actions#test) and
[Build](https://github.com/webbertakken/unity-actions#build)
actions from the 
[Unity Actions](https://github.com/webbertakken/unity-actions) 
collection too.


## Usage

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

_**Note:** I was not able to verify these steps as i don't have a pro license. Feel free 
to give 
[feedback](https://github.com/webbertakken/unity-activate/issues/new) or 
[contribute](https://github.com/webbertakken/unity-activate)._

## More actions

Visit 
[Unity Actions](https://github.com/webbertakken/unity-actions) 
to find related actions for Unity.

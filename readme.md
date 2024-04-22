<a name="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/normalframework/alc-plugin">
    <img src="logo.png" alt="Logo" width="300">
  </a>

  <h2 align="center">Automated Logic Import</h3>
  <p align="center">
    A Normal Framework plugin that allows import of Automated Logic reports.
  </p>
</div>


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#installation">Installation</a>
    </li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#data">Data</a></li>
    <li><a href="#reference">Reference</a></li>
  </ol>
</details>

## Installation

To install, create a new application and use the Github git url of this repository.

![Install][install-screenshot]


## Getting Started

1. Follow the export instructions in Step 1 to export your data from ALC.
2. Upload your file.
3. Preview and update your data.

![AppScreenshot][app-screenshot]

### Data

The import data is added to the `ALC` layer in NF. Data can be grouped by the location field to form a heirarchy based on location. If there are any points in the ALC export that do not exist in NF, they will be skipped.

![Data][data-example]

## Reference

[Automated Logic](https://www.automatedlogic.com/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[data-example]: images/data-example.png
[app-screenshot]: images/app-screenshot.png
[point-selection-screenshot]: images/point-selection.png
[install-screenshot]: images/install-screenshot.png
[runs-menu-screenshot]: images/runs-menu.png
[time-series-screenshot]: images/time-series.png

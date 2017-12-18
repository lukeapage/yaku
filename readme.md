# Overview

A fork of [Yaku](https://github.com/ysmood/yaku) with the addition of one method useful for testing - flush.

# Promise.flush()

A method that when called, will call out all waiting resolved and rejected promises, so that they resolve synchronously.

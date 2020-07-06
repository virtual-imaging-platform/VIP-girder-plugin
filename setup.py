from setuptools import setup, find_packages
setup(
    name='girder-vip',            # The name registered on PyPI
    version='3.0.0',
    description='Use VIP applications.', # This text will be displayed on the plugin page
    include_package_data=True,
    packages=find_packages(exclude=['plugin_tests']),
    zip_safe=False,
    setup_requires=['setuptools-git'],
    install_requires=['girder>=3'],      # Add any plugin dependencies here
    entry_points={
      'girder.plugin': [              # Register the plugin with girder.  The next line registers
                                      # our plugin under the name "example".  The name here must be
                                      # unique for all installed plugins.  The right side points to
                                      # a subclass of GirderPlugin inside your plugin.
          'vip = girder_vip:VipPlugin'
      ]
    }
)

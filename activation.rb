# Using .map.compact just so that it doesn't crash immediately on Ruby 2.6
env = ENV.map do |k, v|
  utf_8_value = v.dup.force_encoding(Encoding::UTF_8)
  "#{k}RUBY_ENVIRONMENTS_VS#{utf_8_value}" if utf_8_value.valid_encoding?
end.compact

env.unshift(RUBY_VERSION, Gem.path.join(","), !!defined?(RubyVM::YJIT), !!defined?(RubyVM::ZJIT))

STDERR.print("RUBY_ENVIRONMENTS_ACTIVATION_SEPARATOR#{env.join("RUBY_ENVIRONMENTS_FS")}RUBY_ENVIRONMENTS_ACTIVATION_SEPARATOR")
